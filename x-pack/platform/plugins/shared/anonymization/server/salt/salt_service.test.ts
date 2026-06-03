/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { SavedObjectsServiceStart } from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import { SaltService, ANONYMIZATION_SALT_SAVED_OBJECT_TYPE } from './salt_service';

describe('SaltService namespace handling', () => {
  it('writes salts using a namespace-scoped internal SO client in default space', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const update = jest.fn().mockResolvedValue(undefined);
    const asScopedToNamespace = jest.fn().mockReturnValue({ create, update });
    const getUnsafeInternalClient = jest.fn().mockReturnValue({ asScopedToNamespace });
    const savedObjects = { getUnsafeInternalClient } as unknown as SavedObjectsServiceStart;

    const getDecryptedAsInternalUser = jest.fn().mockRejectedValue({ statusCode: 404 });
    const getClient = jest.fn().mockReturnValue({ getDecryptedAsInternalUser });
    const encryptedSavedObjects = { getClient } as unknown as EncryptedSavedObjectsPluginStart;

    const service = new SaltService(savedObjects, encryptedSavedObjects, loggerMock.create());

    await service.getSalt('default');

    expect(asScopedToNamespace).toHaveBeenCalledWith('default');
    expect(create).toHaveBeenCalledWith(
      ANONYMIZATION_SALT_SAVED_OBJECT_TYPE,
      expect.any(Object),
      expect.objectContaining({ id: expect.any(String) })
    );
  });

  it('writes salts using a namespace-scoped internal SO client in non-default space', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const update = jest.fn().mockResolvedValue(undefined);
    const asScopedToNamespace = jest.fn().mockReturnValue({ create, update });
    const getUnsafeInternalClient = jest.fn().mockReturnValue({ asScopedToNamespace });
    const savedObjects = { getUnsafeInternalClient } as unknown as SavedObjectsServiceStart;

    const getDecryptedAsInternalUser = jest.fn().mockRejectedValue({ statusCode: 404 });
    const getClient = jest.fn().mockReturnValue({ getDecryptedAsInternalUser });
    const encryptedSavedObjects = { getClient } as unknown as EncryptedSavedObjectsPluginStart;

    const service = new SaltService(savedObjects, encryptedSavedObjects, loggerMock.create());

    await service.getSalt('security');

    expect(asScopedToNamespace).toHaveBeenCalledWith('security');
    expect(create).toHaveBeenCalledWith(
      ANONYMIZATION_SALT_SAVED_OBJECT_TYPE,
      expect.any(Object),
      expect.objectContaining({ id: expect.any(String) })
    );
  });

  it('uses hidden type for reads and writes', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const update = jest.fn().mockResolvedValue(undefined);
    const asScopedToNamespace = jest.fn().mockReturnValue({ create, update });
    const getUnsafeInternalClient = jest.fn().mockReturnValue({ asScopedToNamespace });
    const savedObjects = { getUnsafeInternalClient } as unknown as SavedObjectsServiceStart;

    const getDecryptedAsInternalUser = jest.fn().mockRejectedValue({ statusCode: 404 });
    const getClient = jest.fn().mockReturnValue({ getDecryptedAsInternalUser });
    const encryptedSavedObjects = { getClient } as unknown as EncryptedSavedObjectsPluginStart;

    const service = new SaltService(savedObjects, encryptedSavedObjects, loggerMock.create());

    await service.getSalt('default');

    expect(getUnsafeInternalClient).toHaveBeenCalledWith({
      includedHiddenTypes: [ANONYMIZATION_SALT_SAVED_OBJECT_TYPE],
    });
    expect(asScopedToNamespace).toHaveBeenCalled();
  });

  it('returns replacements encryption key from existing key material', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const update = jest.fn().mockResolvedValue(undefined);
    const asScopedToNamespace = jest.fn().mockReturnValue({ create, update });
    const getUnsafeInternalClient = jest.fn().mockReturnValue({ asScopedToNamespace });
    const savedObjects = { getUnsafeInternalClient } as unknown as SavedObjectsServiceStart;

    const getDecryptedAsInternalUser = jest.fn().mockResolvedValue({
      attributes: {
        salt: 'salt-value',
        replacementsEncryptionKey: 'managed-replacements-key',
      },
    });
    const getClient = jest.fn().mockReturnValue({ getDecryptedAsInternalUser });
    const encryptedSavedObjects = { getClient } as unknown as EncryptedSavedObjectsPluginStart;

    const service = new SaltService(savedObjects, encryptedSavedObjects, loggerMock.create());

    await expect(service.getReplacementsEncryptionKey('default')).resolves.toBe(
      'managed-replacements-key'
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('backfills replacements encryption key when missing from legacy salt doc', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const update = jest.fn().mockResolvedValue(undefined);
    const asScopedToNamespace = jest.fn().mockReturnValue({ create, update });
    const getUnsafeInternalClient = jest.fn().mockReturnValue({ asScopedToNamespace });
    const savedObjects = { getUnsafeInternalClient } as unknown as SavedObjectsServiceStart;

    const getDecryptedAsInternalUser = jest.fn().mockResolvedValue({
      attributes: {
        salt: 'legacy-salt',
      },
    });
    const getClient = jest.fn().mockReturnValue({ getDecryptedAsInternalUser });
    const encryptedSavedObjects = { getClient } as unknown as EncryptedSavedObjectsPluginStart;

    const service = new SaltService(savedObjects, encryptedSavedObjects, loggerMock.create());

    const replacementsKey = await service.getReplacementsEncryptionKey('security');

    expect(replacementsKey).toBeTruthy();
    expect(update).toHaveBeenCalledWith(
      ANONYMIZATION_SALT_SAVED_OBJECT_TYPE,
      expect.any(String),
      expect.objectContaining({
        replacementsEncryptionKey: expect.any(String),
      })
    );
  });
});
