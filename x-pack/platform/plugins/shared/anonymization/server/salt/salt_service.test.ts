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
  it('writes salts in default space with undefined namespace', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const getUnsafeInternalClient = jest.fn().mockReturnValue({ create });
    const savedObjects = { getUnsafeInternalClient } as unknown as SavedObjectsServiceStart;

    const getDecryptedAsInternalUser = jest.fn().mockRejectedValue({ statusCode: 404 });
    const getClient = jest.fn().mockReturnValue({ getDecryptedAsInternalUser });
    const encryptedSavedObjects = { getClient } as unknown as EncryptedSavedObjectsPluginStart;

    const service = new SaltService(savedObjects, encryptedSavedObjects, loggerMock.create());

    await service.getSalt('default');

    expect(create.mock.calls[0][2]).toEqual(
      expect.objectContaining({
        namespace: undefined,
      })
    );
  });

  it('writes salts in non-default space using that namespace', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const getUnsafeInternalClient = jest.fn().mockReturnValue({ create });
    const savedObjects = { getUnsafeInternalClient } as unknown as SavedObjectsServiceStart;

    const getDecryptedAsInternalUser = jest.fn().mockRejectedValue({ statusCode: 404 });
    const getClient = jest.fn().mockReturnValue({ getDecryptedAsInternalUser });
    const encryptedSavedObjects = { getClient } as unknown as EncryptedSavedObjectsPluginStart;

    const service = new SaltService(savedObjects, encryptedSavedObjects, loggerMock.create());

    await service.getSalt('security');

    expect(create.mock.calls[0][2]).toEqual(
      expect.objectContaining({
        namespace: 'security',
      })
    );
  });

  it('uses hidden type for reads and writes', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const getUnsafeInternalClient = jest.fn().mockReturnValue({ create });
    const savedObjects = { getUnsafeInternalClient } as unknown as SavedObjectsServiceStart;

    const getDecryptedAsInternalUser = jest.fn().mockRejectedValue({ statusCode: 404 });
    const getClient = jest.fn().mockReturnValue({ getDecryptedAsInternalUser });
    const encryptedSavedObjects = { getClient } as unknown as EncryptedSavedObjectsPluginStart;

    const service = new SaltService(savedObjects, encryptedSavedObjects, loggerMock.create());

    await service.getSalt('default');

    expect(getUnsafeInternalClient).toHaveBeenCalledWith({
      includedHiddenTypes: [ANONYMIZATION_SALT_SAVED_OBJECT_TYPE],
    });
  });
});
