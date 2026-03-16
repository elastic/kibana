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

describe('NotificationPolicyClient', () => {
  let client: NotificationPolicyClient;
  let notificationPolicySavedObjectService: NotificationPolicySavedObjectService;
  let mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let userService: UserService;
  let userProfile: jest.Mocked<UserProfileServiceStart>;
  let apiKeyService: jest.Mocked<ApiKeyServiceContract>;

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
  });

  beforeEach(() => {
    jest.clearAllMocks();

    ({ notificationPolicySavedObjectService, mockSavedObjectsClient } =
      createNotificationPolicySavedObjectService());
    ({ userService, userProfile } = createUserService());
    apiKeyService = createMockApiKeyService();

    client = new NotificationPolicyClient(
      notificationPolicySavedObjectService,
      userService,
      apiKeyService
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
          enabled: true,
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
          enabled: true,
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
          enabled: true,
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
    });
  });

  describe('getNotificationPolicy', () => {
    it('returns a notification policy by id with auth.apiKey stripped', async () => {
      const existingAttributes: NotificationPolicySavedObjectAttributes = {
        name: 'test-policy',
        description: 'test-policy description',
        enabled: true,
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
        enabled: true,
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
        enabled: true,
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
        enabled: true,
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
        enabled: true,
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
        enabled: true,
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
        enabled: true,
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
        enabled: true,
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
    });
  });

  describe('enableNotificationPolicy', () => {
    const updatedAttributes: NotificationPolicySavedObjectAttributes = {
      name: 'snoozed-policy',
      description: 'snoozed-policy description',
      enabled: true,
      destinations: [{ type: 'workflow', id: 'test-workflow' }],
      auth: {
        apiKey: 'some-key',
        owner: 'test-user',
        createdByUser: false,
      },
      createdBy: 'elastic_profile_uid',
      createdAt: '2024-12-01T00:00:00.000Z',
      updatedBy: 'elastic_profile_uid',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };

    it('does a partial update then fetches the full policy', async () => {
      mockSavedObjectsClient.update.mockResolvedValueOnce({
        id: 'policy-id-enable',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        attributes: {} as NotificationPolicySavedObjectAttributes,
        references: [],
        version: 'WzIsMV0=',
      });
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-enable',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        attributes: updatedAttributes,
        references: [],
        version: 'WzIsMV0=',
      });

      const res = await client.enableNotificationPolicy({ id: 'policy-id-enable' });

      expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
        NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        'policy-id-enable',
        {
          enabled: true,
          updatedBy: 'elastic_profile_uid',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
        undefined
      );

      expect(res.id).toBe('policy-id-enable');
      expect(res.auth).not.toHaveProperty('apiKey');
    });

    it('throws 404 when policy is not found on follow-up get', async () => {
      mockSavedObjectsClient.update.mockResolvedValueOnce({
        id: 'policy-id-enable-404',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        attributes: {} as NotificationPolicySavedObjectAttributes,
        references: [],
      });
      mockSavedObjectsClient.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
          'policy-id-enable-404'
        )
      );

      await expect(
        client.enableNotificationPolicy({ id: 'policy-id-enable-404' })
      ).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
    });
  });

  describe('disableNotificationPolicy', () => {
    it('does a partial update with enabled=false', async () => {
      const updatedAttributes: NotificationPolicySavedObjectAttributes = {
        name: 'active-policy',
        description: 'active-policy description',
        enabled: false,
        destinations: [{ type: 'workflow', id: 'test-workflow' }],
        auth: {
          apiKey: 'some-key',
          owner: 'test-user',
          createdByUser: false,
        },
        createdBy: 'elastic_profile_uid',
        createdAt: '2024-12-01T00:00:00.000Z',
        updatedBy: 'elastic_profile_uid',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.update.mockResolvedValueOnce({
        id: 'policy-id-disable',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        attributes: {} as NotificationPolicySavedObjectAttributes,
        references: [],
        version: 'WzIsMV0=',
      });
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-disable',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        attributes: updatedAttributes,
        references: [],
        version: 'WzIsMV0=',
      });

      const res = await client.disableNotificationPolicy({ id: 'policy-id-disable' });

      expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
        NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        'policy-id-disable',
        {
          enabled: false,
          updatedBy: 'elastic_profile_uid',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
        undefined
      );

      expect(res.id).toBe('policy-id-disable');
      expect(res.auth).not.toHaveProperty('apiKey');
    });
  });

  describe('snoozeNotificationPolicy', () => {
    it('does a partial update with snoozedUntil', async () => {
      const updatedAttributes: NotificationPolicySavedObjectAttributes = {
        name: 'active-policy',
        description: 'active-policy description',
        enabled: true,
        destinations: [{ type: 'workflow', id: 'test-workflow' }],
        snoozedUntil: '2025-06-01T12:00:00.000Z',
        auth: {
          apiKey: 'some-key',
          owner: 'test-user',
          createdByUser: false,
        },
        createdBy: 'elastic_profile_uid',
        createdAt: '2024-12-01T00:00:00.000Z',
        updatedBy: 'elastic_profile_uid',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.update.mockResolvedValueOnce({
        id: 'policy-id-snooze',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        attributes: {} as NotificationPolicySavedObjectAttributes,
        references: [],
        version: 'WzIsMV0=',
      });
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-snooze',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        attributes: updatedAttributes,
        references: [],
        version: 'WzIsMV0=',
      });

      const res = await client.snoozeNotificationPolicy({
        id: 'policy-id-snooze',
        snoozedUntil: '2025-06-01T12:00:00.000Z',
      });

      expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
        NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        'policy-id-snooze',
        {
          snoozedUntil: '2025-06-01T12:00:00.000Z',
          updatedBy: 'elastic_profile_uid',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
        undefined
      );

      expect(res.id).toBe('policy-id-snooze');
    });

    it('throws 400 when snoozedUntil is not a valid ISO datetime', async () => {
      await expect(
        client.snoozeNotificationPolicy({
          id: 'policy-id-snooze',
          snoozedUntil: 'not-a-date',
        })
      ).rejects.toMatchObject({
        output: { statusCode: 400 },
      });

      expect(mockSavedObjectsClient.update).not.toHaveBeenCalled();
    });
  });

  describe('bulkActionNotificationPolicies', () => {
    it('issues a single bulkUpdate with partial attrs for mixed actions', async () => {
      mockSavedObjectsClient.bulkUpdate.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'policy-1',
            type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
            attributes: {},
            references: [],
            version: 'WzMsMV0=',
          },
          {
            id: 'policy-2',
            type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
            attributes: {},
            references: [],
            version: 'WzQsMV0=',
          },
          {
            id: 'policy-3',
            type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
            attributes: {},
            references: [],
            version: 'WzUsMV0=',
          },
          {
            id: 'policy-4',
            type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
            attributes: {},
            references: [],
            version: 'WzYsMV0=',
          },
        ],
      });

      const res = await client.bulkActionNotificationPolicies({
        actions: [
          { id: 'policy-1', action: 'enable' },
          { id: 'policy-2', action: 'disable' },
          { id: 'policy-3', action: 'snooze', snoozed_until: '2025-06-01T12:00:00.000Z' },
          { id: 'policy-4', action: 'unsnooze' },
        ],
      });

      expect(mockSavedObjectsClient.bulkUpdate).toHaveBeenCalledTimes(1);
      expect(mockSavedObjectsClient.bulkUpdate).toHaveBeenCalledWith([
        {
          type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
          id: 'policy-1',
          attributes: {
            enabled: true,
            snoozedUntil: null,
            updatedBy: 'elastic_profile_uid',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
        },
        {
          type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
          id: 'policy-2',
          attributes: {
            enabled: false,
            snoozedUntil: null,
            updatedBy: 'elastic_profile_uid',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
        },
        {
          type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
          id: 'policy-3',
          attributes: {
            snoozedUntil: '2025-06-01T12:00:00.000Z',
            updatedBy: 'elastic_profile_uid',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
        },
        {
          type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
          id: 'policy-4',
          attributes: {
            snoozedUntil: null,
            updatedBy: 'elastic_profile_uid',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
        },
      ]);

      expect(mockSavedObjectsClient.get).not.toHaveBeenCalled();
      expect(mockSavedObjectsClient.update).not.toHaveBeenCalled();

      expect(res).toEqual({ processed: 4, total: 4, errors: [] });
    });

    it('collects errors from bulkUpdate response', async () => {
      mockSavedObjectsClient.bulkUpdate.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'missing-policy',
            type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
            attributes: {} as NotificationPolicySavedObjectAttributes,
            references: [],
            error: {
              statusCode: 404,
              error: 'Not Found',
              message: 'Saved object [notification_policy/missing-policy] not found',
            },
          },
        ],
      });

      const res = await client.bulkActionNotificationPolicies({
        actions: [{ id: 'missing-policy', action: 'enable' }],
      });

      expect(res.processed).toBe(0);
      expect(res.total).toBe(1);
      expect(res.errors).toHaveLength(1);
      expect(res.errors[0].id).toBe('missing-policy');
    });
  });

  describe('deleteNotificationPolicy', () => {
    it('deletes a notification policy successfully', async () => {
      const existingAttributes: NotificationPolicySavedObjectAttributes = {
        name: 'policy-to-delete',
        description: 'policy-to-delete description',
        enabled: true,
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
  });
});
