/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { spacesMock } from '@kbn/spaces-plugin/server/mocks';
import { NOTIFICATION_POLICY_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import { NotificationPolicySavedObjectService } from './notification_policy_saved_object_service';

/**
 * Creates a mock Encrypted Saved Objects plugin (getClient) for use in tests that need
 * getDecryptedAsInternalUser (e.g. NotificationPolicyClient.getDecryptedAuth).
 */
export function createMockEncryptedSavedObjects(
  getDecryptedAttrs?: (id: string) => { apiKey: string; createdByUser: boolean } | null
) {
  const getDecryptedAsInternalUser = jest.fn().mockImplementation((_type: string, id: string) => {
    const attrs = getDecryptedAttrs?.(id);
    if (!attrs) return Promise.reject(new Error('not found'));
    return Promise.resolve({
      id,
      type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
      attributes: {
        auth: { apiKey: attrs.apiKey, createdByUser: attrs.createdByUser, owner: 'test-user' },
      },
      references: [],
    });
  });
  return {
    getClient: jest.fn().mockReturnValue({ getDecryptedAsInternalUser }),
  };
}

const createMockEncryptedSavedObjectsClient = (): jest.Mocked<EncryptedSavedObjectsClient> =>
  ({
    getDecryptedAsInternalUser: jest.fn(),
    createPointInTimeFinderDecryptedAsInternalUser: jest.fn(),
  } as unknown as jest.Mocked<EncryptedSavedObjectsClient>);

export function createNotificationPolicySavedObjectService(): {
  notificationPolicySavedObjectService: NotificationPolicySavedObjectService;
  mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  mockEncryptedSavedObjectsClient: jest.Mocked<EncryptedSavedObjectsClient>;
  mockFindAllDecrypted: jest.SpyInstance;
} {
  const mockSavedObjectsClient = savedObjectsClientMock.create();
  const mockSpaces = spacesMock.createStart();
  const mockEncryptedSavedObjectsClient = createMockEncryptedSavedObjectsClient();

  const notificationPolicySavedObjectService = new NotificationPolicySavedObjectService(
    mockSavedObjectsClient,
    mockSpaces,
    mockEncryptedSavedObjectsClient
  );

  const mockFindAllDecrypted = jest
    .spyOn(notificationPolicySavedObjectService, 'findAllDecrypted')
    .mockResolvedValue([]);

  return {
    notificationPolicySavedObjectService,
    mockSavedObjectsClient,
    mockEncryptedSavedObjectsClient,
    mockFindAllDecrypted,
  };
}
