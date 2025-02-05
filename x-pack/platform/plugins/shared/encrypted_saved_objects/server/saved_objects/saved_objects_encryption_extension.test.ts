/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockGetDescriptorNamespace } from './saved_objects_encryption_extension.test.mocks';

import { savedObjectsTypeRegistryMock } from '@kbn/core/server/mocks';

import { SavedObjectsEncryptionExtension } from './saved_objects_encryption_extension';
import { EncryptionError } from '../crypto';
import { encryptedSavedObjectsServiceMock } from '../crypto/encrypted_saved_objects_service.mocks';
import { EncryptionErrorOperation } from '../crypto/encryption_error';

const KNOWN_TYPE = 'known-type';
const ATTRIBUTE_TO_STRIP = 'attrSecret';
const ATTRIBUTE_TO_DECRYPT = 'attrNotSoSecret';
const DESCRIPTOR_NAMESPACE = 'descriptor-namespace';
const CURRENT_USER = 'current-user';

beforeAll(() => {
  // Mock the getDescriptorNamespace result so we don't exercise that functionality in these unit tests
  mockGetDescriptorNamespace.mockReturnValue(DESCRIPTOR_NAMESPACE);
});

function setup() {
  const mockBaseTypeRegistry = savedObjectsTypeRegistryMock.create();
  const mockService = encryptedSavedObjectsServiceMock.createWithTypes([
    {
      type: KNOWN_TYPE,
      attributesToEncrypt: new Set([
        ATTRIBUTE_TO_STRIP,
        { key: ATTRIBUTE_TO_DECRYPT, dangerouslyExposeValue: true },
      ]),
    },
  ]);
  return {
    extension: new SavedObjectsEncryptionExtension({
      baseTypeRegistry: mockBaseTypeRegistry,
      service: mockService,
      getCurrentUser: jest.fn().mockReturnValue(CURRENT_USER),
    }),
    service: mockService,
  };
}

describe('#isEncryptableType', () => {
  test('returns true for known types', () => {
    const { extension } = setup();
    expect(extension.isEncryptableType(KNOWN_TYPE)).toBe(true);
  });

  test('returns false for unknown types', () => {
    const { extension } = setup();
    expect(extension.isEncryptableType('unknown-type')).toBe(false);
  });
});

describe('#decryptOrStripResponseAttributes', () => {
  const unregisteredSO = {
    id: 'some-id',
    type: 'unknown-type',
    attributes: {
      attrOne: 'one',
      attrSecret: 'secret',
      attrNotSoSecret: 'not-so-secret',
      attrThree: 'three',
    },
    score: 1,
    references: [],
  };

  const registeredSO = {
    id: 'some-id-2',
    type: KNOWN_TYPE,
    attributes: {
      attrOne: 'one',
      attrSecret: '*secret*',
      attrNotSoSecret: '*not-so-secret*',
      attrThree: 'three',
    },
    score: 1,
    references: [],
  };

  test('does not alter response if type is not registered', async () => {
    const { extension, service } = setup();

    await expect(extension.decryptOrStripResponseAttributes(unregisteredSO)).resolves.toEqual({
      ...unregisteredSO,
      attributes: {
        attrOne: 'one',
        attrSecret: 'secret',
        attrNotSoSecret: 'not-so-secret',
        attrThree: 'three',
      },
    });

    expect(service.decryptAttributes).not.toHaveBeenCalled();
  });

  test('strips encrypted attributes except for ones with `dangerouslyExposeValue` set to `true` if type is registered', async () => {
    const { extension, service } = setup();

    await expect(extension.decryptOrStripResponseAttributes(registeredSO)).resolves.toEqual({
      ...registeredSO,
      attributes: { attrOne: 'one', attrNotSoSecret: 'not-so-secret', attrThree: 'three' },
    });

    expect(service.stripOrDecryptAttributes).toHaveBeenCalledTimes(1);
  });

  test('includes both attributes and error if decryption fails.', async () => {
    const { extension, service } = setup();

    const decryptionError = new EncryptionError(
      'something failed',
      'attrNotSoSecret',
      EncryptionErrorOperation.Decryption
    );
    service.stripOrDecryptAttributes.mockResolvedValue({
      attributes: { attrOne: 'one', attrThree: 'three' },
      error: decryptionError,
    });

    await expect(extension.decryptOrStripResponseAttributes(unregisteredSO)).resolves.toEqual({
      ...unregisteredSO,
      attributes: {
        attrOne: 'one',
        attrSecret: 'secret',
        attrNotSoSecret: 'not-so-secret',
        attrThree: 'three',
      },
    });

    expect(service.stripOrDecryptAttributes).not.toHaveBeenCalled();

    await expect(extension.decryptOrStripResponseAttributes(registeredSO)).resolves.toEqual({
      ...registeredSO,
      attributes: { attrOne: 'one', attrThree: 'three' },
      error: decryptionError,
    });

    expect(service.stripOrDecryptAttributes).toHaveBeenCalledTimes(1);
  });
});

describe('#encryptAttributes', () => {
  test('does not encrypt attributes if type is not registered', async () => {
    const { extension, service } = setup();

    await expect(
      extension.encryptAttributes(
        {
          type: 'unknown-type',
          id: 'mock-saved-object-id',
          namespace: undefined,
        },
        {
          attrOne: 'one',
          attrSecret: 'secret',
          attrNotSoSecret: 'not-so-secret',
          attrThree: 'three',
        }
      )
    ).resolves.toEqual({
      attrOne: 'one',
      attrSecret: 'secret',
      attrNotSoSecret: 'not-so-secret',
      attrThree: 'three',
    });

    expect(service.encryptAttributes).not.toBeCalled();
  });

  test('encrypts attributes if the type is registered', async () => {
    const { extension, service } = setup();

    await expect(
      extension.encryptAttributes(
        {
          type: KNOWN_TYPE,
          id: 'mock-saved-object-id',
          namespace: undefined,
        },
        {
          attrOne: 'one',
          attrSecret: 'secret',
          attrNotSoSecret: 'not-so-secret',
          attrThree: 'three',
        }
      )
    ).resolves.toEqual({
      attrOne: 'one',
      attrSecret: '*secret*',
      attrNotSoSecret: '*not-so-secret*',
      attrThree: 'three',
    });

    expect(service.encryptAttributes).toBeCalledTimes(1);
  });
});
