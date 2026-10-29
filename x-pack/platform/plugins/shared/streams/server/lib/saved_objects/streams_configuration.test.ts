/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import nodeCrypto from '@elastic/node-crypto';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { EncryptionError } from '@kbn/encrypted-saved-objects-plugin/server';
import { EncryptedSavedObjectsService } from '@kbn/encrypted-saved-objects-plugin/server/crypto';
import {
  streamsConfigurationEncryptedType,
  streamsConfigurationSavedObjectType,
} from './streams_configuration';

const v1Attributes = { unit_id: 'default', unit: { sources: [] }, secrets: 'encrypted' };
const blobA = `v1.kid-1.oKGio6Slpqeoqaqr.${'A'.repeat(22)}`;
const blobB = `v1.kid-1.oKGio6Slpqeoqaqr.${'B'.repeat(21)}A`;

describe('streams-configuration create schema', () => {
  const createSchema = () => {
    const { modelVersions } = streamsConfigurationSavedObjectType;
    const versions = typeof modelVersions === 'function' ? modelVersions() : modelVersions;
    const create = versions?.['1']?.schemas?.create;
    // Without this the optional chain would let the tests pass when the schema is missing.
    expect(create).toBeDefined();
    return create as NonNullable<typeof create>;
  };

  it('accepts a document without a cache', () => {
    expect(() => createSchema().validate(v1Attributes)).not.toThrow();
  });

  it('accepts a cache on create', () => {
    expect(() =>
      createSchema().validate({
        ...v1Attributes,
        sealed_credentials: [{ name: 'es-prod', target: 'dev', ciphertext: blobA }],
      })
    ).not.toThrow();
  });

  it.each([
    ['legacy base64', 'oKGio6Slpqeoqaqrg2tRQjC/L94='],
    ['short IV and tag', 'v1.kid-1.AAAA.BBBB'],
    ['a 25 char ct that Go cannot decode', `v1.kid-1.oKGio6Slpqeoqaqr.${'A'.repeat(25)}`],
    ['a ct with non-zero trailing bits', `v1.kid-1.oKGio6Slpqeoqaqr.${'A'.repeat(21)}B`],
  ])('rejects a cached ciphertext in %s form on create', (_, ciphertext) => {
    expect(() =>
      createSchema().validate({
        ...v1Attributes,
        sealed_credentials: [{ name: 'es-prod', target: 'dev', ciphertext }],
      })
    ).toThrow();
  });
});

describe('streams-configuration encryption', () => {
  const descriptor = { type: streamsConfigurationEncryptedType.type, id: 'default' };
  const attributes = {
    unit_id: 'default',
    unit: { sources: [] },
    secrets: JSON.stringify({ 'es-a': 'first', 'es-b': 'second' }),
    sealed_credentials: [
      { name: 'es-a', target: 'dev', ciphertext: blobA },
      { name: 'es-b', target: 'dev', ciphertext: blobB },
    ],
  };

  let service: EncryptedSavedObjectsService;

  beforeEach(() => {
    service = new EncryptedSavedObjectsService({
      primaryCrypto: nodeCrypto({ encryptionKey: 'streams-configuration-test-key-0123' }),
      logger: loggingSystemMock.createLogger(),
    });
    service.registerType(streamsConfigurationEncryptedType);
  });

  it('decrypts secrets while the cache is unchanged', async () => {
    const encrypted = await service.encryptAttributes(descriptor, attributes);

    const decrypted = await service.decryptAttributes(descriptor, encrypted);

    expect(decrypted.secrets).toBe(attributes.secrets);
  });

  it('refuses to decrypt secrets after two cached blobs are swapped', async () => {
    const encrypted = await service.encryptAttributes(descriptor, attributes);
    const swapped = {
      ...encrypted,
      sealed_credentials: [
        { name: 'es-a', target: 'dev', ciphertext: blobB },
        { name: 'es-b', target: 'dev', ciphertext: blobA },
      ],
    };

    await expect(service.decryptAttributes(descriptor, swapped)).rejects.toThrow(EncryptionError);
  });
});
