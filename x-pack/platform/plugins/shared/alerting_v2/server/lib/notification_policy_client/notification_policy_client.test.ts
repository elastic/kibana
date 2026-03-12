/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { UserProfileServiceStart } from '@kbn/core-user-profile-server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import {
  NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
  type NotificationPolicySavedObjectAttributes,
} from '../../saved_objects';
import type { NotificationPolicySavedObjectService } from '../services/notification_policy_saved_object_service/notification_policy_saved_object_service';
import { createNotificationPolicySavedObjectService } from '../services/notification_policy_saved_object_service/notification_policy_saved_object_service.mock';
import type { UserService } from '../services/user_service/user_service';
import { createUserProfile, createUserService } from '../services/user_service/user_service.mock';
import type { ApiKeyServiceContract } from '../services/api_key_service/api_key_service';
import { createMockApiKeyService } from '../services/api_key_service/api_key_service.mock';
import { NotificationPolicyClient } from './notification_policy_client';

function createMockRequest(): { url: { pathname: string } } {
  return { url: { pathname: '/s/default' } };
}

function createMockEncryptedSavedObjects(
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

function createMockSpaces() {
  return {
    spacesService: {
      getSpaceId: jest.fn().mockReturnValue('default'),
      spaceIdToNamespace: jest.fn().mockImplementation((id: string) => id),
    },
  };
}

describe('NotificationPolicyClient', () => {
  let client: NotificationPolicyClient;
  let notificationPolicySavedObjectService: NotificationPolicySavedObjectService;
  let mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let userService: UserService;
  let userProfile: jest.Mocked<UserProfileServiceStart>;
  let apiKeyService: jest.Mocked<ApiKeyServiceContract>;
  let mockRequest: ReturnType<typeof createMockRequest>;
  let mockEncryptedSavedObjects: ReturnType<typeof createMockEncryptedSavedObjects>;
  let mockSpaces: ReturnType<typeof createMockSpaces>;

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
  });

  beforeEach(() => {
    jest.clearAllMocks();

    ({ notificationPolicySavedObjectService, mockSavedObjectsClient } =
      createNotificationPolicySavedObjectService());
    ({ userService, userProfile } = createUserService());
    apiKeyService = createMockApiKeyService();
    mockRequest = createMockRequest();
    mockEncryptedSavedObjects = createMockEncryptedSavedObjects((id) => {
      if (id === 'policy-id-update-1') return { apiKey: 'old-api-key', createdByUser: false };
      if (id === 'policy-id-del-1') return { apiKey: 'some-key', createdByUser: false };
      return null;
    });
    mockSpaces = createMockSpaces();

    client = new NotificationPolicyClient(
      notificationPolicySavedObjectService,
      userService,
      apiKeyService,
      mockRequest as any,
      mockEncryptedSavedObjects as any,
      mockSpaces as any
    );

    userProfile.getCurrent.mockResolvedValue(createUserProfile('elastic_profile_uid'));

    mockSavedObjectsClient.create.mockResolvedValue({
      id: 'policy-id-default',
      type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
      attributes: {} as NotificationPolicySavedObjectAttributes,
      references: [],
      version: 'WzEsMV0=',
    });
    mockSavedObjectsClient.update.mockResolvedValue({
      id: 'policy-id-default',
      type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
      attributes: {} as NotificationPolicySavedObjectAttributes,
      references: [],
      version: 'WzEsMV0=',
    });
    mockSavedObjectsClient.delete.mockResolvedValue({});
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('createNotificationPolicy', () => {
    it('creates a notification policy with correct attributes including API key', async () => {
      mockSavedObjectsClient.create.mockResolvedValueOnce({
        id: 'policy-id-1',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        attributes: {} as NotificationPolicySavedObjectAttributes,
        references: [],
        version: 'WzEsMV0=',
      });

      const res = await client.createNotificationPolicy({
        data: {
          name: 'my-policy',
          description: 'my-policy description',
          destinations: [{ type: 'workflow', id: 'my-workflow' }],
        },
        options: { id: 'policy-id-1' },
      });

      expect(apiKeyService.create).toHaveBeenCalledWith('Notification Policy: my-policy');

      expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
        NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          name: 'my-policy',
          description: 'my-policy description',
          destinations: [{ type: 'workflow', id: 'my-workflow' }],
          auth: {
            apiKey: 'encoded-es-api-key',
            owner: 'test-user',
            createdByUser: false,
          },
          createdBy: 'elastic_profile_uid',
          updatedBy: 'elastic_profile_uid',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        }),
        { id: 'policy-id-1', overwrite: false }
      );

      expect(res).toEqual(
        expect.objectContaining({
          id: 'policy-id-1',
          version: 'WzEsMV0=',
          name: 'my-policy',
          description: 'my-policy description',
          destinations: [{ type: 'workflow', id: 'my-workflow' }],
          auth: {
            owner: 'test-user',
            createdByUser: false,
          },
          createdBy: 'elastic_profile_uid',
          updatedBy: 'elastic_profile_uid',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        })
      );

      expect(res.auth).not.toHaveProperty('apiKey');
    });

    it('creates a notification policy without custom id', async () => {
      mockSavedObjectsClient.create.mockImplementationOnce(async (_type, _attrs, options) => {
        return {
          id: (options?.id ?? 'auto-generated-id') as string,
          type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
          attributes: {} as NotificationPolicySavedObjectAttributes,
          references: [],
          version: 'WzEsMV0=',
        };
      });

      const res = await client.createNotificationPolicy({
        data: {
          name: 'my-policy',
          description: 'my-policy description',
          destinations: [{ type: 'workflow', id: 'my-workflow' }],
        },
      });

      expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
        NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          name: 'my-policy',
          description: 'my-policy description',
          destinations: [{ type: 'workflow', id: 'my-workflow' }],
          auth: {
            apiKey: 'encoded-es-api-key',
            owner: 'test-user',
            createdByUser: false,
          },
        }),
        expect.objectContaining({
          overwrite: false,
          id: expect.any(String),
        })
      );

      expect(res.id).toEqual(expect.any(String));
      expect(res.name).toBe('my-policy');
      expect(res.description).toBe('my-policy description');
      expect(res.destinations).toEqual([{ type: 'workflow', id: 'my-workflow' }]);
      expect(res.auth).not.toHaveProperty('apiKey');
    });

    it('throws 400 when data is invalid', async () => {
      await expect(
        client.createNotificationPolicy({
          data: {
            name: 'my-policy',
            description: 'my-policy description',
            destinations: [],
          },
        })
      ).rejects.toMatchObject({
        output: { statusCode: 400 },
      });

      expect(mockSavedObjectsClient.create).not.toHaveBeenCalled();
    });

    it('throws 409 conflict when id already exists', async () => {
      mockSavedObjectsClient.create.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createConflictError(
          NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
          'policy-id-conflict'
        )
      );

      await expect(
        client.createNotificationPolicy({
          data: {
            name: 'my-policy',
            description: 'my-policy description',
            destinations: [{ type: 'workflow', id: 'my-workflow' }],
          },
          options: { id: 'policy-id-conflict' },
        })
      ).rejects.toMatchObject({
        output: { statusCode: 409 },
      });

      expect(apiKeyService.markApiKeysForInvalidation).toHaveBeenCalledWith([
        'encoded-es-api-key',
      ]);
    });

    it('marks new API key for invalidation when create fails after key was created', async () => {
      mockSavedObjectsClient.create.mockRejectedValueOnce(new Error('storage error'));

      await expect(
        client.createNotificationPolicy({
          data: {
            name: 'my-policy',
            description: 'my-policy description',
            destinations: [{ type: 'workflow', id: 'my-workflow' }],
          },
          options: { id: 'policy-id-1' },
        })
      ).rejects.toThrow('storage error');

      expect(apiKeyService.markApiKeysForInvalidation).toHaveBeenCalledWith([
        'encoded-es-api-key',
      ]);
    });
  });

  describe('getNotificationPolicy', () => {
    it('returns a notification policy by id with auth.apiKey stripped', async () => {
      const existingAttributes: NotificationPolicySavedObjectAttributes = {
        name: 'test-policy',
        description: 'test-policy description',
        destinations: [{ type: 'workflow', id: 'test-workflow' }],
        auth: {
          apiKey: 'encrypted-api-key',
          owner: 'test-user',
          createdByUser: false,
        },
        createdBy: 'elastic_profile_uid',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'elastic_profile_uid',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-get-1',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        attributes: existingAttributes,
        references: [],
        version: 'WzEsMV0=',
      });

      const res = await client.getNotificationPolicy({ id: 'policy-id-get-1' });

      expect(mockSavedObjectsClient.get).toHaveBeenCalledWith(
        NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        'policy-id-get-1',
        undefined
      );
      expect(res.auth).toEqual({ owner: 'test-user', createdByUser: false });
      expect(res.auth).not.toHaveProperty('apiKey');
    });

    it('throws 404 when notification policy is not found', async () => {
      mockSavedObjectsClient.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
          'policy-id-get-404'
        )
      );

      await expect(client.getNotificationPolicy({ id: 'policy-id-get-404' })).rejects.toMatchObject(
        {
          output: { statusCode: 404 },
        }
      );
    });
  });

  describe('getNotificationPolicies', () => {
    it('returns notification policies for multiple ids in input order', async () => {
      const firstAttributes: NotificationPolicySavedObjectAttributes = {
        name: 'policy-two',
        description: 'policy-two description',
        destinations: [{ type: 'workflow', id: 'workflow-two' }],
        auth: {
          apiKey: 'secret-key-2',
          owner: 'user-2',
          createdByUser: false,
        },
        createdBy: 'elastic_profile_uid',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'elastic_profile_uid',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      const secondAttributes: NotificationPolicySavedObjectAttributes = {
        name: 'policy-one',
        description: 'policy-one description',
        destinations: [{ type: 'workflow', id: 'workflow-one' }],
        auth: {
          apiKey: 'secret-key-1',
          owner: 'user-1',
          createdByUser: false,
        },
        createdBy: 'elastic_profile_uid',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'elastic_profile_uid',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'policy-id-get-2',
            type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
            attributes: firstAttributes,
            references: [],
            version: 'WzIsMV0=',
          },
          {
            id: 'policy-id-get-1',
            type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
            attributes: secondAttributes,
            references: [],
            version: 'WzEsMV0=',
          },
        ],
      });

      const res = await client.getNotificationPolicies({
        ids: ['policy-id-get-2', 'policy-id-get-1'],
      });

      expect(res).toHaveLength(2);
      expect(res[0].auth).toEqual({ owner: 'user-2', createdByUser: false });
      expect(res[0].auth).not.toHaveProperty('apiKey');
      expect(res[1].auth).toEqual({ owner: 'user-1', createdByUser: false });
      expect(res[1].auth).not.toHaveProperty('apiKey');
    });

    it('returns an empty array when ids are empty', async () => {
      const res = await client.getNotificationPolicies({ ids: [] });

      expect(res).toEqual([]);
    });

    it('ignores missing notification policies and returns found policies', async () => {
      const firstAttributes: NotificationPolicySavedObjectAttributes = {
        name: 'policy-found-one',
        description: 'policy-found-one description',
        destinations: [{ type: 'workflow', id: 'workflow-found-one' }],
        auth: {
          apiKey: 'key-1',
          owner: 'user-1',
          createdByUser: false,
        },
        createdBy: 'elastic_profile_uid',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'elastic_profile_uid',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      const thirdAttributes: NotificationPolicySavedObjectAttributes = {
        name: 'policy-found-three',
        description: 'policy-found-three description',
        destinations: [{ type: 'workflow', id: 'workflow-found-three' }],
        auth: {
          apiKey: 'key-3',
          owner: 'user-3',
          createdByUser: false,
        },
        createdBy: 'elastic_profile_uid',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'elastic_profile_uid',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'policy-id-get-found-1',
            type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
            attributes: firstAttributes,
            references: [],
            version: 'WzEsMV0=',
          },
          {
            id: 'policy-id-get-missing',
            type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
            attributes: {} as NotificationPolicySavedObjectAttributes,
            references: [],
            error: {
              statusCode: 404,
              error: 'Not Found',
              message: 'Saved object [notification_policy/policy-id-get-missing] not found',
            },
          },
          {
            id: 'policy-id-get-found-3',
            type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
            attributes: thirdAttributes,
            references: [],
            version: 'WzMsMV0=',
          },
        ],
      });

      const res = await client.getNotificationPolicies({
        ids: ['policy-id-get-found-1', 'policy-id-get-missing', 'policy-id-get-found-3'],
      });

      expect(res).toHaveLength(2);
      expect(res[0].id).toBe('policy-id-get-found-1');
      expect(res[0].auth).not.toHaveProperty('apiKey');
      expect(res[1].id).toBe('policy-id-get-found-3');
      expect(res[1].auth).not.toHaveProperty('apiKey');
    });

    it('ignores documents with non-404 errors and returns valid documents', async () => {
      const validAttributes: NotificationPolicySavedObjectAttributes = {
        name: 'policy-valid',
        description: 'policy-valid description',
        destinations: [{ type: 'workflow', id: 'workflow-valid' }],
        auth: {
          apiKey: 'valid-key',
          owner: 'valid-user',
          createdByUser: false,
        },
        createdBy: 'elastic_profile_uid',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'elastic_profile_uid',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'policy-id-valid',
            type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
            attributes: validAttributes,
            references: [],
            version: 'WzEsMV0=',
          },
          {
            id: 'policy-id-error-500',
            type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
            attributes: {} as NotificationPolicySavedObjectAttributes,
            references: [],
            error: {
              statusCode: 500,
              error: 'Internal Server Error',
              message: 'Something went wrong',
            },
          },
        ],
      });

      const res = await client.getNotificationPolicies({
        ids: ['policy-id-valid', 'policy-id-error-500'],
      });

      expect(res).toHaveLength(1);
      expect(res[0].id).toBe('policy-id-valid');
      expect(res[0].auth).toEqual({ owner: 'valid-user', createdByUser: false });
      expect(res[0].auth).not.toHaveProperty('apiKey');
    });
  });

  describe('updateNotificationPolicy', () => {
    it('updates a notification policy and rotates the API key', async () => {
      const existingAttributes: NotificationPolicySavedObjectAttributes = {
        name: 'original-policy',
        description: 'original-policy description',
        destinations: [{ type: 'workflow', id: 'original-workflow' }],
        auth: {
          apiKey: 'old-api-key',
          owner: 'old-user',
          createdByUser: false,
        },
        createdBy: 'creator_profile_uid',
        createdAt: '2024-12-01T00:00:00.000Z',
        updatedBy: 'updater_profile_uid',
        updatedAt: '2024-12-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-update-1',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
        version: 'WzEsMV0=',
        attributes: existingAttributes,
      });
      mockSavedObjectsClient.update.mockResolvedValueOnce({
        id: 'policy-id-update-1',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        attributes: {} as NotificationPolicySavedObjectAttributes,
        references: [],
        version: 'WzIsMV0=',
      });

      const res = await client.updateNotificationPolicy({
        data: {
          name: 'updated-policy',
          destinations: [{ type: 'workflow', id: 'updated-workflow' }],
        },
        options: { id: 'policy-id-update-1', version: 'WzEsMV0=' },
      });

      expect(apiKeyService.create).toHaveBeenCalledWith('Notification Policy: updated-policy');

      expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
        NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        'policy-id-update-1',
        expect.objectContaining({
          name: 'updated-policy',
          description: 'original-policy description',
          destinations: [{ type: 'workflow', id: 'updated-workflow' }],
          auth: {
            apiKey: 'encoded-es-api-key',
            owner: 'test-user',
            createdByUser: false,
          },
          updatedBy: 'elastic_profile_uid',
          updatedAt: '2025-01-01T00:00:00.000Z',
          createdBy: 'creator_profile_uid',
          createdAt: '2024-12-01T00:00:00.000Z',
        }),
        { version: 'WzEsMV0=' }
      );

      expect(res).toEqual(
        expect.objectContaining({
          id: 'policy-id-update-1',
          version: 'WzIsMV0=',
          name: 'updated-policy',
          description: 'original-policy description',
          destinations: [{ type: 'workflow', id: 'updated-workflow' }],
          auth: {
            owner: 'test-user',
            createdByUser: false,
          },
          updatedAt: '2025-01-01T00:00:00.000Z',
        })
      );

      expect(res.auth).not.toHaveProperty('apiKey');

      expect(apiKeyService.markApiKeysForInvalidation).toHaveBeenCalledWith(['old-api-key']);
    });

    it('does not call invalidation for old key when decrypted policy has createdByUser: true', async () => {
      const existingAttributes: NotificationPolicySavedObjectAttributes = {
        name: 'original-policy',
        description: 'original-policy description',
        destinations: [{ type: 'workflow', id: 'original-workflow' }],
        auth: {
          apiKey: 'old-api-key',
          owner: 'old-user',
          createdByUser: true,
        },
        createdBy: 'creator_profile_uid',
        createdAt: '2024-12-01T00:00:00.000Z',
        updatedBy: 'updater_profile_uid',
        updatedAt: '2024-12-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-update-1',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
        version: 'WzEsMV0=',
        attributes: existingAttributes,
      });
      mockSavedObjectsClient.update.mockResolvedValueOnce({
        id: 'policy-id-update-1',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        attributes: {} as NotificationPolicySavedObjectAttributes,
        references: [],
        version: 'WzIsMV0=',
      });
      const esoClient = mockEncryptedSavedObjects.getClient();
      (esoClient.getDecryptedAsInternalUser as jest.Mock).mockResolvedValueOnce({
        id: 'policy-id-update-1',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        attributes: {
          auth: { apiKey: 'old-api-key', createdByUser: true, owner: 'test-user' },
        },
        references: [],
      });

      await client.updateNotificationPolicy({
        data: {
          name: 'updated-policy',
          destinations: [{ type: 'workflow', id: 'updated-workflow' }],
        },
        options: { id: 'policy-id-update-1', version: 'WzEsMV0=' },
      });

      expect(apiKeyService.markApiKeysForInvalidation).not.toHaveBeenCalled();
    });

    it('when update throws, calls invalidation with the new (unused) key', async () => {
      const existingAttributes: NotificationPolicySavedObjectAttributes = {
        name: 'original-policy',
        description: 'original-policy description',
        destinations: [{ type: 'workflow', id: 'original-workflow' }],
        auth: {
          apiKey: 'old-api-key',
          owner: 'old-user',
          createdByUser: false,
        },
        createdBy: 'creator_profile_uid',
        createdAt: '2024-12-01T00:00:00.000Z',
        updatedBy: 'updater_profile_uid',
        updatedAt: '2024-12-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-update-throw',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
        version: 'WzEsMV0=',
        attributes: existingAttributes,
      });
      mockSavedObjectsClient.update.mockRejectedValueOnce(new Error('storage error'));
      const esoClient = mockEncryptedSavedObjects.getClient();
      (esoClient.getDecryptedAsInternalUser as jest.Mock).mockResolvedValueOnce({
        id: 'policy-id-update-throw',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        attributes: {
          auth: { apiKey: 'old-api-key', createdByUser: false, owner: 'test-user' },
        },
        references: [],
      });

      await expect(
        client.updateNotificationPolicy({
          data: {
            name: 'updated-policy',
            destinations: [{ type: 'workflow', id: 'updated-workflow' }],
          },
          options: { id: 'policy-id-update-throw', version: 'WzEsMV0=' },
        })
      ).rejects.toThrow('storage error');

      expect(apiKeyService.markApiKeysForInvalidation).toHaveBeenCalledWith([
        'encoded-es-api-key',
      ]);
    });

    it('does not call invalidation on success when decrypted policy has no apiKey', async () => {
      const existingAttributes: NotificationPolicySavedObjectAttributes = {
        name: 'original-policy',
        description: 'original-policy description',
        destinations: [{ type: 'workflow', id: 'original-workflow' }],
        auth: {
          owner: 'old-user',
          createdByUser: false,
        },
        createdBy: 'creator_profile_uid',
        createdAt: '2024-12-01T00:00:00.000Z',
        updatedBy: 'updater_profile_uid',
        updatedAt: '2024-12-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-update-no-key',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
        version: 'WzEsMV0=',
        attributes: existingAttributes,
      });
      mockSavedObjectsClient.update.mockResolvedValueOnce({
        id: 'policy-id-update-no-key',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        attributes: {} as NotificationPolicySavedObjectAttributes,
        references: [],
        version: 'WzIsMV0=',
      });
      const esoClient = mockEncryptedSavedObjects.getClient();
      (esoClient.getDecryptedAsInternalUser as jest.Mock).mockResolvedValueOnce({
        id: 'policy-id-update-no-key',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        attributes: {
          auth: { createdByUser: false, owner: 'test-user' },
        },
        references: [],
      });

      await client.updateNotificationPolicy({
        data: {
          name: 'updated-policy',
          destinations: [{ type: 'workflow', id: 'updated-workflow' }],
        },
        options: { id: 'policy-id-update-no-key', version: 'WzEsMV0=' },
      });

      expect(apiKeyService.markApiKeysForInvalidation).not.toHaveBeenCalled();
    });

    it('throws 400 when data is invalid', async () => {
      await expect(
        client.updateNotificationPolicy({
          data: { destinations: [] },
          options: { id: 'policy-id-update-invalid', version: 'WzEsMV0=' },
        })
      ).rejects.toMatchObject({
        output: { statusCode: 400 },
      });

      expect(mockSavedObjectsClient.get).not.toHaveBeenCalled();
      expect(mockSavedObjectsClient.update).not.toHaveBeenCalled();
    });

    it('throws 404 when notification policy is not found', async () => {
      mockSavedObjectsClient.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
          'policy-id-update-404'
        )
      );

      await expect(
        client.updateNotificationPolicy({
          data: { destinations: [{ type: 'workflow', id: 'some-workflow' }] },
          options: { id: 'policy-id-update-404', version: 'WzEsMV0=' },
        })
      ).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
    });

    it('throws 409 conflict when version is stale', async () => {
      const existingAttributes: NotificationPolicySavedObjectAttributes = {
        name: 'original-policy',
        description: 'original-policy description',
        destinations: [{ type: 'workflow', id: 'original-workflow' }],
        auth: {
          apiKey: 'old-api-key',
          owner: 'old-user',
          createdByUser: false,
        },
        createdBy: 'creator_profile_uid',
        createdAt: '2024-12-01T00:00:00.000Z',
        updatedBy: 'updater_profile_uid',
        updatedAt: '2024-12-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-conflict',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
        version: 'WzEsMV0=',
        attributes: existingAttributes,
      });

      mockSavedObjectsClient.update.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createConflictError(
          NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
          'policy-id-conflict'
        )
      );

      await expect(
        client.updateNotificationPolicy({
          data: { destinations: [{ type: 'workflow', id: 'new-workflow' }] },
          options: { id: 'policy-id-conflict', version: 'WzEsMV0=' },
        })
      ).rejects.toMatchObject({
        output: { statusCode: 409 },
      });

      expect(apiKeyService.markApiKeysForInvalidation).toHaveBeenCalledWith([
        'encoded-es-api-key',
      ]);
    });
  });

  describe('deleteNotificationPolicy', () => {
    it('deletes a notification policy successfully', async () => {
      const existingAttributes: NotificationPolicySavedObjectAttributes = {
        name: 'policy-to-delete',
        description: 'policy-to-delete description',
        destinations: [{ type: 'workflow', id: 'workflow-to-delete' }],
        auth: {
          apiKey: 'some-key',
          owner: 'test-user',
          createdByUser: false,
        },
        createdBy: 'elastic_profile_uid',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'elastic_profile_uid',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-del-1',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
        version: 'WzEsMV0=',
        attributes: existingAttributes,
      });

      await client.deleteNotificationPolicy({ id: 'policy-id-del-1' });

      expect(mockSavedObjectsClient.delete).toHaveBeenCalledWith(
        NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        'policy-id-del-1'
      );
      expect(apiKeyService.markApiKeysForInvalidation).toHaveBeenCalledWith(['some-key']);
    });

    it('throws 404 when notification policy is not found', async () => {
      mockSavedObjectsClient.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
          'policy-id-del-404'
        )
      );

      await expect(
        client.deleteNotificationPolicy({ id: 'policy-id-del-404' })
      ).rejects.toMatchObject({
        output: { statusCode: 404 },
      });

      expect(mockSavedObjectsClient.delete).not.toHaveBeenCalled();
    });

    it('does not mark API key for invalidation when policy auth was createdByUser', async () => {
      const esoClient = mockEncryptedSavedObjects.getClient();
      (esoClient.getDecryptedAsInternalUser as jest.Mock).mockResolvedValueOnce({
        id: 'policy-id-del-user',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        attributes: {
          auth: { apiKey: 'user-created-key', createdByUser: true, owner: 'test-user' },
        },
        references: [],
      });
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-del-user',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
        version: 'WzEsMV0=',
        attributes: {
          name: 'user-policy',
          description: '',
          destinations: [],
          auth: { apiKey: 'user-created-key', owner: 'test-user', createdByUser: true },
          createdBy: 'elastic_profile_uid',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedBy: 'elastic_profile_uid',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
      });

      await client.deleteNotificationPolicy({ id: 'policy-id-del-user' });

      expect(mockSavedObjectsClient.delete).toHaveBeenCalledWith(
        NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        'policy-id-del-user'
      );
      expect(apiKeyService.markApiKeysForInvalidation).not.toHaveBeenCalled();
    });

    it('does not call invalidation when decrypted policy has no apiKey', async () => {
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-del-no-key',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
        version: 'WzEsMV0=',
        attributes: {
          name: 'policy-no-key',
          description: '',
          destinations: [],
          auth: { owner: 'test-user', createdByUser: false },
          createdBy: 'elastic_profile_uid',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedBy: 'elastic_profile_uid',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
      });
      const esoClient = mockEncryptedSavedObjects.getClient();
      (esoClient.getDecryptedAsInternalUser as jest.Mock).mockResolvedValueOnce({
        id: 'policy-id-del-no-key',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        attributes: {
          auth: { createdByUser: false, owner: 'test-user' },
        },
        references: [],
      });

      await client.deleteNotificationPolicy({ id: 'policy-id-del-no-key' });

      expect(mockSavedObjectsClient.delete).toHaveBeenCalledWith(
        NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        'policy-id-del-no-key'
      );
      expect(apiKeyService.markApiKeysForInvalidation).not.toHaveBeenCalled();
    });
  });
});
