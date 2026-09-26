/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateKeyPairSync } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';
import { CATALOG_PUBLIC_KEYS } from './keys/catalog_public_keys';
import { signCatalogForTests, verifyCatalogSignature } from './signature';

const DEV_PUBLIC = readFileSync(
  path.join(__dirname, '__fixtures__/dev_signing_key/catalog_dev_public_key.pem'),
  'utf8'
);
const DEV_PRIVATE = readFileSync(
  path.join(__dirname, '__fixtures__/dev_signing_key/catalog_dev_private_key.pem'),
  'utf8'
);

describe('verifyCatalogSignature', () => {
  const bytes = '{"schemaVersion":1}\n';

  it('accepts a signature from the first public key', () => {
    const signature = signCatalogForTests(bytes, DEV_PRIVATE);
    expect(verifyCatalogSignature(bytes, signature, [DEV_PUBLIC])).toBe(true);
    expect(verifyCatalogSignature(bytes, signature, CATALOG_PUBLIC_KEYS)).toBe(true);
  });

  it('accepts a signature from the second public key', () => {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const signature = signCatalogForTests(bytes, privatePem);
    expect(verifyCatalogSignature(bytes, signature, [DEV_PUBLIC, publicPem])).toBe(true);
  });

  it('rejects tampered bytes', () => {
    const signature = signCatalogForTests(bytes, DEV_PRIVATE);
    expect(verifyCatalogSignature(`${bytes} `, signature, [DEV_PUBLIC])).toBe(false);
  });

  it('rejects a signature from a different key', () => {
    const { publicKey } = generateKeyPairSync('ed25519');
    const otherPublic = publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const signature = signCatalogForTests(bytes, DEV_PRIVATE);
    expect(verifyCatalogSignature(bytes, signature, [otherPublic])).toBe(false);
  });
});
