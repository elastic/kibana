# Catalog dev signing key

Test-only Ed25519 key pair for the PoC catalog. Generated with:

```js
const { generateKeyPairSync } = require('crypto');
const { publicKey, privateKey } = generateKeyPairSync('ed25519');
publicKey.export({ type: 'spki', format: 'pem' });
privateKey.export({ type: 'pkcs8', format: 'pem' });
```

Replace `CATALOG_PUBLIC_KEYS` with the Elastic production key before the first release.
Replace this key if it is ever used outside tests.
