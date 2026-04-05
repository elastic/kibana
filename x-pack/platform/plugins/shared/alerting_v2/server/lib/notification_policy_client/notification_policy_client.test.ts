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
import type { ApiKeyServiceContract } from '../services/api_key_service/api_key_service';
import { createMockApiKeyService } from '../services/api_key_service/api_key_service.mock';
import type { NotificationPolicySavedObjectService } from '../services/notification_policy_saved_object_service/notification_policy_saved_object_service';
import {
  createMockEncryptedSavedObjects,
  createNotificationPolicySavedObjectService,
} from '../services/notification_policy_saved_object_service/notification_policy_saved_object_service.mock';
import type { UserService } from '../services/user_service/user_service';
import { createUserProfile, createUserService } from '../services/user_service/user_service.mock';
import { NotificationPolicyClient } from './notification_policy_client';

describe('NotificationPolicyClient', () => {
  let client: NotificationPolicyClient;
  let notificationPolicySavedObjectService: NotificationPolicySavedObjectService;
  let mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let userService: UserService;
  let userProfileService: jest.Mocked<UserProfileServiceStart>;
  let apiKeyService: jest.Mocked<ApiKeyServiceContract>;
  let mockEncryptedSavedObjects: ReturnType<typeof createMockEncryptedSavedObjects>;
  let mockEsoClient: ReturnType<ReturnType<typeof createMockEncryptedSavedObjects>['getClient']>;

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
  });

  beforeEach(() => {
    jest.clearAllMocks();

    ({ notificationPolicySavedObjectService, mockSavedObjectsClient } =
      createNotificationPolicySavedObjectService());
    ({ userService, userProfileService } = createUserService());
    apiKeyService = createMockApiKeyService();
    mockEncryptedSavedObjects = createMockEncryptedSavedObjects((id) => {
      if (id === 'policy-id-update-1') return { apiKey: 'old-api-key', createdByUser: false };
      if (id === 'policy-id-update-key-1') return { apiKey: 'old-api-key', createdByUser: false };
      if (id === 'policy-id-update-key-user')
        return { apiKey: 'user-created-key', createdByUser: true };
      if (id === 'policy-id-del-1') return { apiKey: 'some-key', createdByUser: false };
      return null;
    });
    mockEsoClient = mockEncryptedSavedObjects.getClient();

    client = new NotificationPolicyClient(
      notificationPolicySavedObjectService,
      userService,
      apiKeyService,
      mockEsoClient as any,
      'default'
    );

    userProfileService.getCurrent.mockResolvedValue(createUserProfile('elastic_profile_uid'));

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
          createdByUsername: 'elastic',
          updatedBy: 'elastic_profile_uid',
          updatedByUsername: 'elastic',
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
          matcher: null,
          groupBy: null,
          throttle: null,
          snoozedUntil: null,
          auth: {
            owner: 'test-user',
            createdByUser: false,
          },
          createdBy: 'elastic_profile_uid',
          createdByUsername: 'elastic',
          updatedBy: 'elastic_profile_uid',
          updatedByUsername: 'elastic',
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
          createdBy: 'elastic_profile_uid',
          createdByUsername: 'elastic',
          updatedBy: 'elastic_profile_uid',
          updatedByUsername: 'elastic',
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
      expect(res.createdByUsername).toBe('elastic');
      expect(res.updatedByUsername).toBe('elastic');
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

      expect(apiKeyService.markApiKeysForInvalidation).toHaveBeenCalledWith(['encoded-es-api-key']);
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

      expect(apiKeyService.markApiKeysForInvalidation).toHaveBeenCalledWith(['encoded-es-api-key']);
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
        createdByUsername: 'elastic',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'elastic_profile_uid',
        updatedByUsername: 'elastic',
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
      expect(res.matcher).toBeNull();
      expect(res.groupBy).toBeNull();
      expect(res.throttle).toBeNull();
      expect(res.snoozedUntil).toBeNull();
      expect(res.auth).toEqual({ owner: 'test-user', createdByUser: false });
      expect(res.createdByUsername).toBe('elastic');
      expect(res.updatedByUsername).toBe('elastic');
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
        createdByUsername: 'elastic',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'elastic_profile_uid',
        updatedByUsername: 'elastic',
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
        createdByUsername: 'elastic',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'elastic_profile_uid',
        updatedByUsername: 'elastic',
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
      expect(res[0].createdByUsername).toBe('elastic');
      expect(res[0].updatedByUsername).toBe('elastic');
      expect(res[0].auth).not.toHaveProperty('apiKey');
      expect(res[1].auth).toEqual({ owner: 'user-1', createdByUser: false });
      expect(res[1].createdByUsername).toBe('elastic');
      expect(res[1].updatedByUsername).toBe('elastic');
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
        createdByUsername: 'elastic',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'elastic_profile_uid',
        updatedByUsername: 'elastic',
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
        createdByUsername: 'elastic',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'elastic_profile_uid',
        updatedByUsername: 'elastic',
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
      expect(res[0].createdByUsername).toBe('elastic');
      expect(res[0].updatedByUsername).toBe('elastic');
      expect(res[0].auth).not.toHaveProperty('apiKey');
      expect(res[1].id).toBe('policy-id-get-found-3');
      expect(res[1].createdByUsername).toBe('elastic');
      expect(res[1].updatedByUsername).toBe('elastic');
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
        createdByUsername: 'elastic',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'elastic_profile_uid',
        updatedByUsername: 'elastic',
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
      expect(res[0].createdByUsername).toBe('elastic');
      expect(res[0].updatedByUsername).toBe('elastic');
      expect(res[0].auth).not.toHaveProperty('apiKey');
    });
  });

  describe('findNotificationPolicies', () => {
    const makeFindResponse = (
      items: Array<{
        id: string;
        attributes: NotificationPolicySavedObjectAttributes;
        version?: string;
      }>,
      total?: number
    ) => ({
      saved_objects: items.map((item) => ({
        id: item.id,
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        attributes: item.attributes,
        references: [],
        score: 0,
        version: item.version ?? 'WzEsMV0=',
      })),
      total: total ?? items.length,
      page: 1,
      per_page: 20,
      pit_id: undefined,
    });

    const policyAttributes: NotificationPolicySavedObjectAttributes = {
      name: 'find-policy',
      description: 'find-policy description',
      enabled: true,
      destinations: [{ type: 'workflow', id: 'find-workflow' }],
      auth: {
        apiKey: 'secret-find-key',
        owner: 'find-user',
        createdByUser: false,
      },
      createdBy: 'elastic_profile_uid',
      createdByUsername: 'elastic',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedBy: 'elastic_profile_uid',
      updatedByUsername: 'elastic',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };

    it('returns items with auth.apiKey stripped', async () => {
      mockSavedObjectsClient.find.mockResolvedValueOnce(
        makeFindResponse([{ id: 'policy-find-1', attributes: policyAttributes }])
      );

      const res = await client.findNotificationPolicies();

      expect(res.items).toHaveLength(1);
      expect(res.items[0].matcher).toBeNull();
      expect(res.items[0].groupBy).toBeNull();
      expect(res.items[0].throttle).toBeNull();
      expect(res.items[0].snoozedUntil).toBeNull();
      expect(res.items[0].auth).toEqual({ owner: 'find-user', createdByUser: false });
      expect(res.items[0].createdByUsername).toBe('elastic');
      expect(res.items[0].updatedByUsername).toBe('elastic');
      expect(res.items[0].auth).not.toHaveProperty('apiKey');
    });

    it('uses default pagination when no params provided', async () => {
      mockSavedObjectsClient.find.mockResolvedValueOnce(makeFindResponse([]));

      const res = await client.findNotificationPolicies();

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
          page: 1,
          perPage: 20,
        })
      );
      expect(res.page).toBe(1);
      expect(res.perPage).toBe(20);
      expect(res.total).toBe(0);
      expect(res.items).toEqual([]);
    });

    it('passes custom pagination params', async () => {
      mockSavedObjectsClient.find.mockResolvedValueOnce(makeFindResponse([]));

      await client.findNotificationPolicies({ page: 3, perPage: 5 });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 3,
          perPage: 5,
        })
      );
    });

    it('forwards search parameter with search fields', async () => {
      mockSavedObjectsClient.find.mockResolvedValueOnce(makeFindResponse([]));

      await client.findNotificationPolicies({ search: 'my-search' });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'my-search',
          searchFields: ['name', 'description', 'destinations.id'],
        })
      );
    });

    it('builds KQL filter for destinationType', async () => {
      mockSavedObjectsClient.find.mockResolvedValueOnce(makeFindResponse([]));

      await client.findNotificationPolicies({ destinationType: 'workflow' });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({ type: 'function' }),
        })
      );
    });

    it('builds KQL filter for createdBy', async () => {
      mockSavedObjectsClient.find.mockResolvedValueOnce(makeFindResponse([]));

      await client.findNotificationPolicies({ createdBy: 'user-123' });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({ type: 'function' }),
        })
      );
    });

    it('builds KQL filter for enabled=true', async () => {
      mockSavedObjectsClient.find.mockResolvedValueOnce(makeFindResponse([]));

      await client.findNotificationPolicies({ enabled: true });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({ type: 'function' }),
        })
      );
    });

    it('builds KQL filter for enabled=false', async () => {
      mockSavedObjectsClient.find.mockResolvedValueOnce(makeFindResponse([]));

      await client.findNotificationPolicies({ enabled: false });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({ type: 'function' }),
        })
      );
    });

    it('maps sort field name to name.keyword', async () => {
      mockSavedObjectsClient.find.mockResolvedValueOnce(makeFindResponse([]));

      await client.findNotificationPolicies({ sortField: 'name', sortOrder: 'asc' });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          sortField: 'name.keyword',
          sortOrder: 'asc',
        })
      );
    });

    it('maps sort field createdAt without transformation', async () => {
      mockSavedObjectsClient.find.mockResolvedValueOnce(makeFindResponse([]));

      await client.findNotificationPolicies({ sortField: 'createdAt', sortOrder: 'desc' });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          sortField: 'createdAt',
          sortOrder: 'desc',
        })
      );
    });

    it('returns multiple items with correct structure', async () => {
      const secondAttributes: NotificationPolicySavedObjectAttributes = {
        ...policyAttributes,
        name: 'find-policy-2',
        auth: {
          apiKey: 'another-secret-key',
          owner: 'another-user',
          createdByUser: true,
        },
      };

      mockSavedObjectsClient.find.mockResolvedValueOnce(
        makeFindResponse(
          [
            { id: 'policy-find-1', attributes: policyAttributes },
            { id: 'policy-find-2', attributes: secondAttributes, version: 'WzIsMV0=' },
          ],
          2
        )
      );

      const res = await client.findNotificationPolicies();

      expect(res.items).toHaveLength(2);
      expect(res.total).toBe(2);

      expect(res.items[0].id).toBe('policy-find-1');
      expect(res.items[0].name).toBe('find-policy');
      expect(res.items[0].auth).toEqual({ owner: 'find-user', createdByUser: false });
      expect(res.items[0].createdByUsername).toBe('elastic');
      expect(res.items[0].updatedByUsername).toBe('elastic');
      expect(res.items[0].auth).not.toHaveProperty('apiKey');

      expect(res.items[1].id).toBe('policy-find-2');
      expect(res.items[1].name).toBe('find-policy-2');
      expect(res.items[1].auth).toEqual({ owner: 'another-user', createdByUser: true });
      expect(res.items[1].createdByUsername).toBe('elastic');
      expect(res.items[1].updatedByUsername).toBe('elastic');
      expect(res.items[1].auth).not.toHaveProperty('apiKey');
    });
  });

  describe('updateNotificationPolicy', () => {
    it('clears nullable fields with null values', async () => {
      const existingAttributes: NotificationPolicySavedObjectAttributes = {
        name: 'original-policy',
        description: 'original-policy description',
        enabled: true,
        destinations: [{ type: 'workflow', id: 'original-workflow' }],
        matcher: 'event.severity: critical',
        groupBy: ['host.name'],
        throttle: { interval: '1h' },
        auth: {
          apiKey: 'old-api-key',
          owner: 'old-user',
          createdByUser: false,
        },
        createdBy: 'creator_profile_uid',
        createdByUsername: 'creator',
        createdAt: '2024-12-01T00:00:00.000Z',
        updatedBy: 'updater_profile_uid',
        updatedByUsername: 'updater',
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
          matcher: null,
          groupBy: null,
          throttle: null,
        },
        options: { id: 'policy-id-update-1', version: 'WzEsMV0=' },
      });

      expect(apiKeyService.create).toHaveBeenCalledWith('Notification Policy: original-policy');
      expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
        NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        'policy-id-update-1',
        expect.objectContaining({
          name: 'original-policy',
          description: 'original-policy description',
          destinations: [{ type: 'workflow', id: 'original-workflow' }],
          matcher: null,
          groupBy: null,
          throttle: null,
          updatedByUsername: 'elastic',
        }),
        { version: 'WzEsMV0=' }
      );
      expect(res.matcher).toBeNull();
      expect(res.groupBy).toBeNull();
      expect(res.throttle).toBeNull();
      expect(res.snoozedUntil).toBeNull();
    });

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
        createdByUsername: 'creator',
        createdAt: '2024-12-01T00:00:00.000Z',
        updatedBy: 'updater_profile_uid',
        updatedByUsername: 'updater',
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
          updatedByUsername: 'elastic',
          updatedAt: '2025-01-01T00:00:00.000Z',
          createdBy: 'creator_profile_uid',
          createdByUsername: 'creator',
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
          createdByUsername: 'creator',
          updatedByUsername: 'elastic',
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
        enabled: true,
        destinations: [{ type: 'workflow', id: 'original-workflow' }],
        auth: {
          apiKey: 'old-api-key',
          owner: 'old-user',
          createdByUser: true,
        },
        createdBy: 'creator_profile_uid',
        createdByUsername: 'creator',
        createdAt: '2024-12-01T00:00:00.000Z',
        updatedBy: 'updater_profile_uid',
        updatedByUsername: 'updater',
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
        enabled: true,
        destinations: [{ type: 'workflow', id: 'original-workflow' }],
        auth: {
          apiKey: 'old-api-key',
          owner: 'old-user',
          createdByUser: false,
        },
        createdBy: 'creator_profile_uid',
        createdByUsername: 'creator',
        createdAt: '2024-12-01T00:00:00.000Z',
        updatedBy: 'updater_profile_uid',
        updatedByUsername: 'updater',
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

      expect(apiKeyService.markApiKeysForInvalidation).toHaveBeenCalledWith(['encoded-es-api-key']);
    });

    it('does not call invalidation on success when decrypted policy has no apiKey', async () => {
      const existingAttributes: NotificationPolicySavedObjectAttributes = {
        name: 'original-policy',
        description: 'original-policy description',
        enabled: true,
        destinations: [{ type: 'workflow', id: 'original-workflow' }],
        auth: {
          owner: 'old-user',
          createdByUser: false,
        },
        createdBy: 'creator_profile_uid',
        createdByUsername: 'creator',
        createdAt: '2024-12-01T00:00:00.000Z',
        updatedBy: 'updater_profile_uid',
        updatedByUsername: 'updater',
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
        enabled: true,
        destinations: [{ type: 'workflow', id: 'original-workflow' }],
        auth: {
          apiKey: 'old-api-key',
          owner: 'old-user',
          createdByUser: false,
        },
        createdBy: 'creator_profile_uid',
        createdByUsername: 'creator',
        createdAt: '2024-12-01T00:00:00.000Z',
        updatedBy: 'updater_profile_uid',
        updatedByUsername: 'updater',
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

      expect(apiKeyService.markApiKeysForInvalidation).toHaveBeenCalledWith(['encoded-es-api-key']);
    });
  });

  describe('updateNotificationPolicyApiKey', () => {
    const existingAttributes: NotificationPolicySavedObjectAttributes = {
      name: 'existing-policy',
      description: 'existing-policy description',
      enabled: true,
      destinations: [{ type: 'workflow', id: 'existing-workflow' }],
      auth: {
        apiKey: 'old-api-key',
        owner: 'old-user',
        createdByUser: false,
      },
      createdBy: 'creator_profile_uid',
      createdByUsername: 'creator',
      createdAt: '2024-12-01T00:00:00.000Z',
      updatedBy: 'updater_profile_uid',
      updatedByUsername: 'updater',
      updatedAt: '2024-12-01T00:00:00.000Z',
    };

    it('creates a new API key, updates only auth and updatedBy fields, and invalidates the old key', async () => {
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-update-key-1',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
        version: 'WzEsMV0=',
        attributes: existingAttributes,
      });

      await client.updateNotificationPolicyApiKey({ id: 'policy-id-update-key-1' });

      expect(apiKeyService.create).toHaveBeenCalledWith('Notification Policy: existing-policy');

      expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
        NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        'policy-id-update-key-1',
        expect.objectContaining({
          auth: {
            apiKey: 'encoded-es-api-key',
            owner: 'test-user',
            createdByUser: false,
          },
          updatedBy: 'elastic_profile_uid',
          updatedByUsername: 'elastic',
          updatedAt: '2025-01-01T00:00:00.000Z',
        }),
        undefined
      );

      // Should not include non-auth attributes in the update
      const updateCallAttrs = mockSavedObjectsClient.update.mock.calls[0][2];
      expect(updateCallAttrs).not.toHaveProperty('name');
      expect(updateCallAttrs).not.toHaveProperty('description');
      expect(updateCallAttrs).not.toHaveProperty('destinations');
      expect(updateCallAttrs).not.toHaveProperty('enabled');

      expect(apiKeyService.markApiKeysForInvalidation).toHaveBeenCalledWith(['old-api-key']);
    });

    it('does not invalidate old API key when createdByUser is true', async () => {
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-update-key-user',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
        version: 'WzEsMV0=',
        attributes: {
          ...existingAttributes,
          auth: {
            apiKey: 'user-created-key',
            owner: 'old-user',
            createdByUser: true,
          },
        },
      });

      await client.updateNotificationPolicyApiKey({ id: 'policy-id-update-key-user' });

      expect(apiKeyService.create).toHaveBeenCalled();
      expect(apiKeyService.markApiKeysForInvalidation).not.toHaveBeenCalled();
    });

    it('throws 404 when notification policy is not found', async () => {
      mockSavedObjectsClient.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
          'policy-id-not-found'
        )
      );

      await expect(
        client.updateNotificationPolicyApiKey({ id: 'policy-id-not-found' })
      ).rejects.toMatchObject({
        output: { statusCode: 404 },
      });

      expect(apiKeyService.create).not.toHaveBeenCalled();
    });

    it('invalidates new API key and throws when update fails', async () => {
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-update-key-1',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
        version: 'WzEsMV0=',
        attributes: existingAttributes,
      });
      mockSavedObjectsClient.update.mockRejectedValueOnce(new Error('storage error'));

      await expect(
        client.updateNotificationPolicyApiKey({ id: 'policy-id-update-key-1' })
      ).rejects.toThrow('storage error');

      expect(apiKeyService.markApiKeysForInvalidation).toHaveBeenCalledWith(['encoded-es-api-key']);
    });

    it('throws 409 conflict when saved object version conflict occurs', async () => {
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-update-key-1',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
        version: 'WzEsMV0=',
        attributes: existingAttributes,
      });
      mockSavedObjectsClient.update.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createConflictError(
          NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
          'policy-id-update-key-1'
        )
      );

      await expect(
        client.updateNotificationPolicyApiKey({ id: 'policy-id-update-key-1' })
      ).rejects.toMatchObject({
        output: { statusCode: 409 },
      });

      expect(apiKeyService.markApiKeysForInvalidation).toHaveBeenCalledWith(['encoded-es-api-key']);
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
      createdByUsername: 'elastic',
      createdAt: '2024-12-01T00:00:00.000Z',
      updatedBy: 'elastic_profile_uid',
      updatedByUsername: 'elastic',
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
          updatedByUsername: 'elastic',
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
        createdByUsername: 'elastic',
        createdAt: '2024-12-01T00:00:00.000Z',
        updatedBy: 'elastic_profile_uid',
        updatedByUsername: 'elastic',
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
          updatedByUsername: 'elastic',
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
        createdByUsername: 'elastic',
        createdAt: '2024-12-01T00:00:00.000Z',
        updatedBy: 'elastic_profile_uid',
        updatedByUsername: 'elastic',
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
          updatedByUsername: 'elastic',
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
          { id: 'policy-3', action: 'snooze', snoozedUntil: '2025-06-01T12:00:00.000Z' },
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
            updatedBy: 'elastic_profile_uid',
            updatedByUsername: 'elastic',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
        },
        {
          type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
          id: 'policy-2',
          attributes: {
            enabled: false,
            updatedBy: 'elastic_profile_uid',
            updatedByUsername: 'elastic',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
        },
        {
          type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
          id: 'policy-3',
          attributes: {
            snoozedUntil: '2025-06-01T12:00:00.000Z',
            updatedBy: 'elastic_profile_uid',
            updatedByUsername: 'elastic',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
        },
        {
          type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
          id: 'policy-4',
          attributes: {
            snoozedUntil: null,
            updatedBy: 'elastic_profile_uid',
            updatedByUsername: 'elastic',
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

    it('handles delete actions via bulkDelete and update actions via bulkUpdate', async () => {
      mockSavedObjectsClient.bulkUpdate.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'policy-1',
            type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
            attributes: {},
            references: [],
            version: 'WzMsMV0=',
          },
        ],
      });
      mockSavedObjectsClient.bulkDelete.mockResolvedValueOnce({
        statuses: [
          {
            id: 'policy-2',
            type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
            success: true,
          },
        ],
      });

      const res = await client.bulkActionNotificationPolicies({
        actions: [
          { id: 'policy-1', action: 'enable' },
          { id: 'policy-2', action: 'delete' },
        ],
      });

      expect(mockSavedObjectsClient.bulkUpdate).toHaveBeenCalledTimes(1);
      expect(mockSavedObjectsClient.bulkUpdate).toHaveBeenCalledWith([
        {
          type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
          id: 'policy-1',
          attributes: {
            enabled: true,
            updatedBy: 'elastic_profile_uid',
            updatedByUsername: 'elastic',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
        },
      ]);
      expect(mockSavedObjectsClient.bulkDelete).toHaveBeenCalledTimes(1);
      expect(mockSavedObjectsClient.bulkDelete).toHaveBeenCalledWith([
        { type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE, id: 'policy-2' },
      ]);

      expect(res).toEqual({ processed: 2, total: 2, errors: [] });
    });

    it('handles delete-only bulk actions without calling bulkUpdate', async () => {
      mockSavedObjectsClient.bulkDelete.mockResolvedValueOnce({
        statuses: [
          {
            id: 'policy-1',
            type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
            success: true,
          },
        ],
      });

      const res = await client.bulkActionNotificationPolicies({
        actions: [{ id: 'policy-1', action: 'delete' }],
      });

      expect(mockSavedObjectsClient.bulkUpdate).not.toHaveBeenCalled();
      expect(mockSavedObjectsClient.bulkDelete).toHaveBeenCalledTimes(1);

      expect(res).toEqual({ processed: 1, total: 1, errors: [] });
    });

    it('collects errors from both bulkUpdate and bulkDelete', async () => {
      mockSavedObjectsClient.bulkUpdate.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'policy-1',
            type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
            attributes: {} as NotificationPolicySavedObjectAttributes,
            references: [],
            error: {
              statusCode: 404,
              error: 'Not Found',
              message: 'Not found',
            },
          },
        ],
      });
      mockSavedObjectsClient.bulkDelete.mockResolvedValueOnce({
        statuses: [
          {
            id: 'policy-2',
            type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
            success: false,
            error: {
              statusCode: 404,
              error: 'Not Found',
              message: 'Not found',
            },
          },
        ],
      });

      const res = await client.bulkActionNotificationPolicies({
        actions: [
          { id: 'policy-1', action: 'enable' },
          { id: 'policy-2', action: 'delete' },
        ],
      });

      expect(res.processed).toBe(0);
      expect(res.total).toBe(2);
      expect(res.errors).toHaveLength(2);
    });

    it('invalidates API keys for successfully bulk-deleted policies', async () => {
      const esoClient = mockEncryptedSavedObjects.getClient();
      (esoClient.createPointInTimeFinderDecryptedAsInternalUser as jest.Mock).mockResolvedValueOnce(
        {
          async *find() {
            yield {
              saved_objects: [
                {
                  id: 'policy-del-1',
                  type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
                  attributes: {
                    auth: { apiKey: 'key-1', createdByUser: false, owner: 'test-user' },
                  },
                  references: [],
                },
                {
                  id: 'policy-del-2',
                  type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
                  attributes: {
                    auth: { apiKey: 'key-2', createdByUser: false, owner: 'test-user' },
                  },
                  references: [],
                },
              ],
            };
          },
          close: jest.fn(),
        }
      );
      mockSavedObjectsClient.bulkDelete.mockResolvedValueOnce({
        statuses: [
          { id: 'policy-del-1', type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE, success: true },
          { id: 'policy-del-2', type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE, success: true },
        ],
      });

      const res = await client.bulkActionNotificationPolicies({
        actions: [
          { id: 'policy-del-1', action: 'delete' },
          { id: 'policy-del-2', action: 'delete' },
        ],
      });

      expect(res).toEqual({ processed: 2, total: 2, errors: [] });
      expect(apiKeyService.markApiKeysForInvalidation).toHaveBeenCalledTimes(2);
      expect(apiKeyService.markApiKeysForInvalidation).toHaveBeenCalledWith(['key-1']);
      expect(apiKeyService.markApiKeysForInvalidation).toHaveBeenCalledWith(['key-2']);
    });

    it('skips API key invalidation for bulk-deleted policies with createdByUser: true', async () => {
      const esoClient = mockEncryptedSavedObjects.getClient();
      (esoClient.createPointInTimeFinderDecryptedAsInternalUser as jest.Mock).mockResolvedValueOnce(
        {
          async *find() {
            yield {
              saved_objects: [
                {
                  id: 'policy-del-user',
                  type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
                  attributes: {
                    auth: { apiKey: 'user-key', createdByUser: true, owner: 'test-user' },
                  },
                  references: [],
                },
              ],
            };
          },
          close: jest.fn(),
        }
      );
      mockSavedObjectsClient.bulkDelete.mockResolvedValueOnce({
        statuses: [
          { id: 'policy-del-user', type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE, success: true },
        ],
      });

      const res = await client.bulkActionNotificationPolicies({
        actions: [{ id: 'policy-del-user', action: 'delete' }],
      });

      expect(res).toEqual({ processed: 1, total: 1, errors: [] });
      expect(apiKeyService.markApiKeysForInvalidation).not.toHaveBeenCalled();
    });

    it('does not throw when PIT finder fails during bulk delete', async () => {
      const esoClient = mockEncryptedSavedObjects.getClient();
      (esoClient.createPointInTimeFinderDecryptedAsInternalUser as jest.Mock).mockRejectedValueOnce(
        new Error('decryption failure')
      );
      mockSavedObjectsClient.bulkDelete.mockResolvedValueOnce({
        statuses: [
          { id: 'policy-del-err', type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE, success: true },
        ],
      });

      const res = await client.bulkActionNotificationPolicies({
        actions: [{ id: 'policy-del-err', action: 'delete' }],
      });

      expect(res).toEqual({ processed: 1, total: 1, errors: [] });
      expect(apiKeyService.markApiKeysForInvalidation).not.toHaveBeenCalled();
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
        createdByUsername: 'elastic',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'elastic_profile_uid',
        updatedByUsername: 'elastic',
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
          createdByUsername: 'elastic',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedBy: 'elastic_profile_uid',
          updatedByUsername: 'elastic',
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
          createdByUsername: 'elastic',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedBy: 'elastic_profile_uid',
          updatedByUsername: 'elastic',
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
