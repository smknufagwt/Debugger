// ============================================================
//  SERVICE WORKER — SMK NURUL FALAH
//  Menangani Push Notification dari Chrome/browser saat halaman
//  tidak aktif / tertutup. File ini harus diletakkan di root
//  direktori yang sama dengan index.html (domain yang sama).
// ============================================================

const CACHE_NAME = 'nufa-cache-v1';
const NOTIF_ICON = 'Logo Smk.png'; // Ganti sesuai path ikon sekolah

// ── Install: cache aset inti ──
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(['/']);
        }).catch(() => {}) // jangan crash kalau offline
    );
});

// ── Activate: bersihkan cache lama ──
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// ── Push Event: menerima push dari server (jika pakai Web Push API) ──
self.addEventListener('push', (event) => {
    let data = { title: '💬 Global Chat SMK Nufa', body: 'Ada pesan baru masuk.' };
    if (event.data) {
        try { data = event.data.json(); } catch (e) { data.body = event.data.text(); }
    }

    const options = {
        body: data.body || 'Ada pesan baru.',
        icon: NOTIF_ICON,
        badge: NOTIF_ICON,
        tag: 'nufa-global-chat',
        renotify: true,
        vibrate: [200, 100, 200],
        data: { url: data.url || '/' },
        actions: [
            { action: 'open', title: '📩 Buka Chat' },
            { action: 'dismiss', title: '✕ Tutup' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || '💬 Global Chat SMK Nufa', options)
    );
});

// ── Notification Click: buka/fokus tab ──
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') return;

    const targetUrl = (event.notification.data && event.notification.data.url) || '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            // Kalau sudah ada tab terbuka → fokus dan kirim sinyal buka chat
            for (const client of clients) {
                if (client.url.includes(self.location.origin)) {
                    client.focus();
                    client.postMessage({ type: 'OPEN_CHAT' });
                    return;
                }
            }
            // Kalau tidak ada tab terbuka → buka tab baru
            return self.clients.openWindow(targetUrl);
        })
    );
});

// ── Message dari halaman (showNotification manual tanpa Push Server) ──
// Ini yang dipakai GlobalChat.notify() saat halaman aktif namun
// notifikasi tetap ingin melalui SW supaya muncul di Chrome notification center.
self.addEventListener('message', (event) => {
    if (!event.data || event.data.type !== 'SHOW_NOTIF') return;

    const { title, body, tag } = event.data;
    const options = {
        body: body || '',
        icon: NOTIF_ICON,
        badge: NOTIF_ICON,
        tag: tag || 'nufa-global-chat',
        renotify: true,
        vibrate: [180, 80, 180],
        data: { url: '/' },
        actions: [
            { action: 'open', title: '📩 Buka Chat' },
            { action: 'dismiss', title: '✕ Tutup' }
        ]
    };

    self.registration.showNotification(title, options).catch(() => {});
});
