var CACHE = 'khaneyab-v2';
var SHELL = ['./', './index.html', './manifest.webmanifest', './privacy.html', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', function(event){
  self.skipWaiting();
  // پوسته‌ی برنامه را کش می‌کنیم؛ اگر یکی از فایل‌ها نبود نصب خراب نشود
  event.waitUntil(caches.open(CACHE).then(function(c){
    return Promise.all(SHELL.map(function(u){ return c.add(u).catch(function(){}); }));
  }));
});
self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

// فقط فایل‌های همین سایت کش می‌شوند؛ درخواست‌های Supabase و نقشه همیشه مستقیم به شبکه می‌روند
self.addEventListener('fetch', function(event){
  var req = event.request;
  if(req.method !== 'GET') return;
  var url = new URL(req.url);
  if(url.origin !== self.location.origin) return;
  if(req.mode === 'navigate'){
    // صفحه: اول شبکه (نسخه‌ی تازه)، اگر آفلاین بود از کش
    event.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone(); caches.open(CACHE).then(function(c){ c.put(req, copy); });
        return res;
      }).catch(function(){ return caches.match(req).then(function(r){ return r || caches.match('./index.html'); }); })
    );
    return;
  }
  // بقیه (آیکون‌ها و ...): از کش بخوان و در پس‌زمینه تازه کن
  event.respondWith(
    caches.match(req).then(function(cached){
      var net = fetch(req).then(function(res){
        if(res && res.ok){ var copy = res.clone(); caches.open(CACHE).then(function(c){ c.put(req, copy); }); }
        return res;
      }).catch(function(){ return cached; });
      return cached || net;
    })
  );
});

self.addEventListener('push', function(event){
  var data = {};
  try{ data = event.data ? event.data.json() : {}; }catch(e){ data = { title: "خانه‌یاب", body: event.data ? event.data.text() : "" }; }
  var title = data.title || "خانه‌یاب";
  var options = {
    body: data.body || "",
    icon: data.icon || undefined,
    badge: data.badge || undefined,
    data: { url: data.url || "./" }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event){
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || "./";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(clientList){
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
