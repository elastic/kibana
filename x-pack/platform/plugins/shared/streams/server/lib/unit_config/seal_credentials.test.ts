/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDecipheriv, randomBytes } from 'crypto';
import { loggerMock } from '@kbn/logging-mocks';
import type { EncryptionKeyStore } from './encryption_key_store';
import { createCredentialSealer } from './seal_credentials';

const KID = '20261014_101500_a3f19b2c';

// The sealer zeroes the key after use, so hand it a copy each time.
const storeFor = (key: Buffer, kid = KID): EncryptionKeyStore => ({
  readCurrent: async () => ({ kid, key: Buffer.from(key) }),
});

const open = (key: Buffer, ciphertext: string): string => {
  const blob = Buffer.from(ciphertext, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, blob.subarray(0, 12));
  decipher.setAuthTag(blob.subarray(blob.length - 16));
  return Buffer.concat([
    decipher.update(blob.subarray(12, blob.length - 16)),
    decipher.final(),
  ]).toString('utf8');
};

describe('createCredentialSealer', () => {
  it('seals each secret as { name, ciphertext } with nonce || ciphertext || tag', async () => {
    const key = randomBytes(32);
    const secrets = {
      es_api_key: 'VnVhQ2ZHY0JDZGJrUW0tZTVhT3g6dWkybHAyYXhUTm1zeWFrdzl0dk5udw==',
      unicode: 'pässwörd-🔑',
      empty: '',
    };
    const seal = createCredentialSealer({ store: storeFor(key), logger: loggerMock.create() });

    const { credentials } = await seal(secrets);

    expect(credentials.map(({ name }) => name)).toEqual(['empty', 'es_api_key', 'unicode']);
    expect(credentials.every((credential) => Object.keys(credential).length === 2)).toBe(true);
    expect(
      Object.fromEntries(credentials.map(({ name, ciphertext }) => [name, open(key, ciphertext)]))
    ).toEqual(secrets);
  });

  it('keeps a secret:<nodeId>:<field> name unchanged', async () => {
    const key = randomBytes(32);
    const seal = createCredentialSealer({ store: storeFor(key), logger: loggerMock.create() });

    const {
      credentials: [{ name, ciphertext }],
    } = await seal({ 'secret:es-remote-1:api_key': 's3cret' });

    expect(name).toBe('secret:es-remote-1:api_key');
    expect(open(key, ciphertext)).toBe('s3cret');
  });

  it('matches the static interop vector', async () => {
    // Verified with Go crypto/cipher NewGCM + Open(nil, blob[:12], blob[12:], nil).
    const key = Buffer.from(
      '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
      'hex'
    );
    const nonce = Buffer.from('a0a1a2a3a4a5a6a7a8a9aaab', 'hex');
    const seal = createCredentialSealer({
      store: storeFor(key),
      logger: loggerMock.create(),
      randomBytes: () => Buffer.from(nonce),
    });

    const { credentials } = await seal({ 'es-out-key': 'es-out-api-key-value' });

    expect(credentials).toEqual([
      {
        name: 'es-out-key',
        ciphertext: 'oKGio6Slpqeoqaqrg2tRQjC/L94SDKq4YgPtqBHALHUe9M4K484GnAyA2+zAyDk7',
      },
    ]);
  });

  it.each([
    ['value', { es_api_key: '\ud800' }],
    ['name', { ['es_api_key\udc00']: 's3cret' }],
  ])(
    'rejects a secret %s with a lone surrogate with 400 instead of sealing U+FFFD',
    async (_, secrets) => {
      const readCurrent = jest.fn();
      const seal = createCredentialSealer({ store: { readCurrent }, logger: loggerMock.create() });

      await expect(seal(secrets)).rejects.toMatchObject({ statusCode: 400 });
      expect(readCurrent).not.toHaveBeenCalled();
    }
  );

  it('fingerprints the plaintext and key, not the random ciphertext', async () => {
    const key = randomBytes(32);
    const logger = loggerMock.create();
    const seal = createCredentialSealer({ store: storeFor(key), logger });
    const rotated = createCredentialSealer({
      store: storeFor(randomBytes(32), '20261114_101500_0badc0de'),
      logger,
    });

    const first = await seal({ es_api_key: 's3cret' });
    const second = await seal({ es_api_key: 's3cret' });
    const changedSecret = await seal({ es_api_key: 'other' });
    const changedKey = await rotated({ es_api_key: 's3cret' });

    expect(first.credentials).not.toEqual(second.credentials);
    expect(first.fingerprint).toEqual(second.fingerprint);
    expect(changedSecret.fingerprint).not.toEqual(first.fingerprint);
    expect(changedKey.fingerprint).not.toEqual(first.fingerprint);
  });
});
