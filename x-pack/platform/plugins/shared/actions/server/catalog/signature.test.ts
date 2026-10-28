/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateKeyPairSync } from 'crypto';
import { signCatalogForTests, verifyCatalogSignature } from './signature';

describe('verifyCatalogSignature', () => {
  const bytes = '{"schemaVersion":1}\n';
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

  it('accepts a signature from a generated key', () => {
    const signature = signCatalogForTests(bytes, privatePem);
    expect(verifyCatalogSignature(bytes, signature, [publicPem])).toBe(true);
  });

  it('rejects tampered bytes', () => {
    const signature = signCatalogForTests(bytes, privatePem);
    expect(verifyCatalogSignature(`${bytes} `, signature, [publicPem])).toBe(false);
  });

  it('rejects a signature from a different key', () => {
    const other = generateKeyPairSync('ed25519');
    const otherPublic = other.publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const signature = signCatalogForTests(bytes, privatePem);
    expect(verifyCatalogSignature(bytes, signature, [otherPublic])).toBe(false);
  });

  it('rejects empty or garbage base64', () => {
    expect(verifyCatalogSignature(bytes, '', [publicPem])).toBe(false);
    expect(verifyCatalogSignature(bytes, '!!!', [publicPem])).toBe(false);
  });

  it('accepts a signature from the second key in the list', () => {
    const second = generateKeyPairSync('ed25519');
    const secondPublic = second.publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const secondPrivate = second.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const signature = signCatalogForTests(bytes, secondPrivate);
    expect(verifyCatalogSignature(bytes, signature, [publicPem, secondPublic])).toBe(true);
  });
});
