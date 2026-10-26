/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDecipheriv, randomBytes } from 'crypto';
import { loggerMock } from '@kbn/logging-mocks';
import { StatusError } from '../streams/errors/status_error';
import type { EncryptionKeyStore } from './encryption_key_store';
import { createCredentialPreparer, parseSealedBlob } from './seal_credentials';

const KID = '20261014_101500_a3f19b2c';
const TARGET = 'dev';
const NO_PREVIOUS = { secrets: {}, sealed: [] };

// The preparer zeroes the key after use, so hand it a copy each time.
const storeFor = (key: Buffer, kid = KID) => ({
  readCurrentKid: jest.fn(async () => kid),
  readKey: jest.fn(async () => Buffer.from(key)),
});

const unusedStore = (): EncryptionKeyStore & {
  readCurrentKid: jest.Mock;
  readKey: jest.Mock;
} => ({ readCurrentKid: jest.fn(), readKey: jest.fn() });

const open = (key: Buffer, blob: string, targetId = TARGET): string => {
  const [version, kid, iv, ct] = blob.split('.');
  expect(version).toBe('v1');
  expect(kid).toBe(KID);
  const sealed = Buffer.from(ct, 'base64url');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
  decipher.setAAD(Buffer.from(targetId, 'utf8'));
  decipher.setAuthTag(sealed.subarray(sealed.length - 16));
  return Buffer.concat([
    decipher.update(sealed.subarray(0, sealed.length - 16)),
    decipher.final(),
  ]).toString('utf8');
};

describe('createCredentialPreparer', () => {
  it('seals each secret as { name, ciphertext } in the v1 blob format', async () => {
    const key = randomBytes(32);
    const secrets = {
      es_api_key: 'VnVhQ2ZHY0JDZGJrUW0tZTVhT3g6dWkybHAyYXhUTm1zeWFrdzl0dk5udw==',
      unicode: 'pässwörd-🔑',
      empty: '',
    };
    const seal = createCredentialPreparer({
      resolveTargetId: () => TARGET,
      store: storeFor(key),
      logger: loggerMock.create(),
    });

    const { credentials } = await seal({ secrets, previous: NO_PREVIOUS });

    expect(credentials.map(({ name }) => name)).toEqual(['empty', 'es_api_key', 'unicode']);
    expect(credentials.every((credential) => Object.keys(credential).length === 2)).toBe(true);
    expect(
      Object.fromEntries(credentials.map(({ name, ciphertext }) => [name, open(key, ciphertext)]))
    ).toEqual(secrets);
  });

  it('returns no credentials and reads no key for empty secrets', async () => {
    const store = unusedStore();
    const resolveTargetId = jest.fn();
    const prepare = createCredentialPreparer({
      store,
      resolveTargetId,
      logger: loggerMock.create(),
    });

    await expect(prepare({ secrets: {}, previous: NO_PREVIOUS })).resolves.toEqual({
      credentials: [],
      sealed: [],
    });
    expect(store.readCurrentKid).not.toHaveBeenCalled();
    expect(store.readKey).not.toHaveBeenCalled();
    expect(resolveTargetId).not.toHaveBeenCalled();
  });

  it('matches the static interop vector', async () => {
    // Go: gcm.Open(nil, iv, ct, []byte("dev")) with iv and ct base64url-decoded from the blob.
    const key = Buffer.from(
      '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
      'hex'
    );
    const seal = createCredentialPreparer({
      resolveTargetId: () => TARGET,
      store: storeFor(key),
      logger: loggerMock.create(),
      randomBytes: () => Buffer.from('a0a1a2a3a4a5a6a7a8a9aaab', 'hex'),
    });

    const { credentials } = await seal({
      secrets: { 'es-out': 'es-out-api-key-value' },
      previous: NO_PREVIOUS,
    });

    expect(credentials).toEqual([
      {
        name: 'es-out',
        ciphertext:
          'v1.20261014_101500_a3f19b2c.oKGio6Slpqeoqaqr.g2tRQjC_L94SDKq4YgPtqBHALHX8Gq7hlEfWR1i3ruUbC3ka',
      },
    ]);
  });

  it('binds the blob to the target id', async () => {
    const key = randomBytes(32);
    const seal = createCredentialPreparer({
      resolveTargetId: () => TARGET,
      store: storeFor(key),
      logger: loggerMock.create(),
    });

    const {
      credentials: [{ ciphertext }],
    } = await seal({ secrets: { 'es-prod': 's3cret' }, previous: NO_PREVIOUS });

    expect(open(key, ciphertext)).toBe('s3cret');
    expect(() => open(key, ciphertext, 'other')).toThrow();
  });

  it('reads the kid back from a v1 blob and rejects other shapes', () => {
    const iv = 'oKGio6Slpqeoqaqr'; // 12 bytes
    const tagOnly = 'A'.repeat(22); // 16 bytes, empty plaintext

    expect(parseSealedBlob(`v1.${KID}.${iv}.${tagOnly}`)).toEqual({ kid: KID });
    for (const blob of [
      'oKGio6Slpqeoqaqrg2tRQjC/L94=', // legacy base64 nonce||ct||tag
      `v2.${KID}.${iv}.${tagOnly}`,
      `v1.${KID}.AAAA.BBBB`, // IV and tag too short
      `v1.${KID}.${iv}.${'A'.repeat(21)}`, // shorter than a tag
      `v1.${KID}.${iv}A.${tagOnly}`, // IV not 12 bytes
      `v1.a.b.${iv}.${tagOnly}`, // dot inside the kid
    ]) {
      expect(parseSealedBlob(blob)).toBeUndefined();
    }
  });

  it.each([
    ['25 chars, a length Go rejects', 'A'.repeat(25)],
    ['non-zero trailing bits', `${'A'.repeat(21)}B`],
  ])('rejects a ct segment that is not canonical base64url: %s', (_, ct) => {
    expect(parseSealedBlob(`v1.${KID}.oKGio6Slpqeoqaqr.${ct}`)).toBeUndefined();
  });

  it.each([
    ['value', { es_api_key: '\ud800' }],
    ['name', { ['es_api_key\udc00']: 's3cret' }],
  ])(
    'rejects a secret %s with a lone surrogate with 400 instead of sealing U+FFFD',
    async (_, secrets) => {
      const store = unusedStore();
      const seal = createCredentialPreparer({
        resolveTargetId: () => TARGET,
        store,
        logger: loggerMock.create(),
      });

      await expect(seal({ secrets, previous: NO_PREVIOUS })).rejects.toMatchObject({
        statusCode: 400,
      });
      expect(store.readCurrentKid).not.toHaveBeenCalled();
    }
  );

  describe('reuse of stored blobs', () => {
    const key = randomBytes(32);
    let blobV1: string;

    beforeAll(async () => {
      // A real blob for `s3cret` under the test key, kid and target.
      const { credentials } = await createCredentialPreparer({
        store: storeFor(key),
        resolveTargetId: () => TARGET,
        logger: loggerMock.create(),
      })({ secrets: { 'es-prod': 's3cret' }, previous: NO_PREVIOUS });
      blobV1 = credentials[0].ciphertext;
    });

    const prepareWith = ({
      store = storeFor(key),
      targetId = TARGET,
    }: { store?: EncryptionKeyStore; targetId?: string } = {}) =>
      createCredentialPreparer({
        store,
        resolveTargetId: () => targetId,
        logger: loggerMock.create(),
      });

    const previousWith = (
      ciphertext: string,
      { target = TARGET, value = 's3cret' }: { target?: string; value?: string } = {}
    ) => ({
      secrets: { 'es-prod': value },
      sealed: [{ name: 'es-prod', target, ciphertext }],
    });

    it('reuses a stored blob when kid, target and value are unchanged', async () => {
      const store = storeFor(key);

      const { credentials } = await prepareWith({ store })({
        secrets: { 'es-prod': 's3cret' },
        previous: previousWith(blobV1),
      });

      expect(credentials).toEqual([{ name: 'es-prod', ciphertext: blobV1 }]);
      expect(store.readKey).not.toHaveBeenCalled();
    });

    it('reuses the blob when the same value is re-sent', async () => {
      const { credentials } = await prepareWith()({
        secrets: { 'es-prod': `${'s3c'}ret` },
        previous: previousWith(blobV1),
      });

      expect(credentials[0].ciphertext).toBe(blobV1);
    });

    it.each([
      ['the value changes', { value: 'old-secret' }],
      ['the re-sent value differs only in length', { value: 's3cret2' }],
      ['the target changes', { target: 'other' }],
    ])('re-seals when %s', async (_, previousOptions) => {
      const { credentials } = await prepareWith()({
        secrets: { 'es-prod': 's3cret' },
        previous: previousWith(blobV1, previousOptions),
      });

      expect(credentials[0].ciphertext).not.toBe(blobV1);
      expect(open(key, credentials[0].ciphertext)).toBe('s3cret');
    });

    it('re-seals when the current kid changes', async () => {
      const rotatedKid = 'new-kid';
      const store = storeFor(key, rotatedKid);

      const { credentials } = await prepareWith({ store })({
        secrets: { 'es-prod': 's3cret' },
        previous: previousWith(blobV1),
      });

      expect(parseSealedBlob(credentials[0].ciphertext)).toEqual({ kid: rotatedKid });
      expect(store.readKey).toHaveBeenCalledWith(rotatedKid);
    });

    it.each([
      ['in another format', 'oKGio6Slpqeoqaqrg2tRQjC/L94='],
      ['whose IV or tag is too short', `v1.${KID}.AAAA.BBBB`],
      ['whose ct is not canonical base64url', `v1.${KID}.oKGio6Slpqeoqaqr.${'A'.repeat(25)}`],
    ])('re-seals a stored blob %s', async (_, ciphertext) => {
      const { credentials } = await prepareWith()({
        secrets: { 'es-prod': 's3cret' },
        previous: previousWith(ciphertext),
      });

      expect(open(key, credentials[0].ciphertext)).toBe('s3cret');
    });

    it('does not reuse when the stored plaintext is missing for that name', async () => {
      const { credentials } = await prepareWith()({
        secrets: { 'es-prod': 's3cret' },
        previous: { secrets: {}, sealed: previousWith(blobV1).sealed },
      });

      expect(credentials[0].ciphertext).not.toBe(blobV1);
    });

    it('seals a secret that has no stored blob', async () => {
      const { credentials } = await prepareWith()({
        secrets: { 'es-prod': 's3cret' },
        previous: { secrets: { 'es-prod': 's3cret' }, sealed: [] },
      });

      expect(open(key, credentials[0].ciphertext)).toBe('s3cret');
    });

    it('reuses every blob without the key file', async () => {
      const store = storeFor(key);
      store.readKey.mockRejectedValue(new StatusError('key file missing', 503));

      await expect(
        prepareWith({ store })({
          secrets: { 'es-prod': 's3cret' },
          previous: previousWith(blobV1),
        })
      ).resolves.toMatchObject({ credentials: [{ name: 'es-prod', ciphertext: blobV1 }] });
    });

    it('fails with 503 when current-kid is unreadable even if every blob is reusable', async () => {
      const store = storeFor(key);
      store.readCurrentKid.mockRejectedValue(new StatusError('cannot read current-kid', 503));

      await expect(
        prepareWith({ store })({
          secrets: { 'es-prod': 's3cret' },
          previous: previousWith(blobV1),
        })
      ).rejects.toMatchObject({ statusCode: 503 });
    });

    it('returns sealed entries with the target for persistence, sorted by name', async () => {
      const { credentials, sealed } = await prepareWith()({
        secrets: { 's3-archive': 'bucket', 'es-prod': 's3cret' },
        previous: previousWith(blobV1),
      });

      expect(sealed.map(({ name, target }) => ({ name, target }))).toEqual([
        { name: 'es-prod', target: TARGET },
        { name: 's3-archive', target: TARGET },
      ]);
      expect(sealed.map(({ name, ciphertext }) => ({ name, ciphertext }))).toEqual(credentials);
    });
  });
});
