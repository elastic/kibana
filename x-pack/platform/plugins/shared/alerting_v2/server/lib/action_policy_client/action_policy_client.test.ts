/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { UserProfileServiceStart } from '@kbn/core-user-profile-server';
import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import {
  ACTION_POLICY_SAVED_OBJECT_TYPE,
  type ActionPolicySavedObjectAttributes,
} from '../../saved_objects';
import type { ApiKeyServiceContract } from '../services/api_key_service/api_key_service';
import { createMockApiKeyService } from '../services/api_key_service/api_key_service.mock';
import type { ActionPolicySavedObjectService } from '../services/action_policy_saved_object_service/action_policy_saved_object_service';
import {
  createMockEncryptedSavedObjects,
  createActionPolicySavedObjectService,
} from '../services/action_policy_saved_object_service/action_policy_saved_object_service.mock';
import type { RulesSavedObjectService } from '../services/rules_saved_object_service/rules_saved_object_service';
import { createRulesSavedObjectService } from '../services/rules_saved_object_service/rules_saved_object_service.mock';
import type { UserService } from '../services/user_service/user_service';
import { createUserService } from '../services/user_service/user_service.mock';
import type { LoggerService } from '../services/logger_service/logger_service';
import { createLoggerService } from '../services/logger_service/logger_service.mock';
import { ALERTING_V2_LOG_CODES } from '../errors/error_codes';
import { ActionPolicyClient } from './action_policy_client';

jest.mock('@kbn/eval-kql', () => ({
  evaluateKql: jest.fn(),
}));

import { evaluateKql } from '@kbn/eval-kql';

describe('ActionPolicyClient', () => {
  let client: ActionPolicyClient;
  let actionPolicySavedObjectService: ActionPolicySavedObjectService;
  let mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let rulesSavedObjectService: RulesSavedObjectService;
  let userService: UserService;
  let userProfileService: jest.Mocked<UserProfileServiceStart>;
  let apiKeyService: jest.Mocked<ApiKeyServiceContract>;
  let loggerService: LoggerService;
  let mockLogger: jest.Mocked<Logger>;
  let mockEncryptedSavedObjects: ReturnType<typeof createMockEncryptedSavedObjects>;
  let mockEsoClient: ReturnType<ReturnType<typeof createMockEncryptedSavedObjects>['getClient']>;

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
  });

  beforeEach(() => {
    jest.clearAllMocks();

    ({ actionPolicySavedObjectService, mockSavedObjectsClient } =
      createActionPolicySavedObjectService());
    ({ rulesSavedObjectService } = createRulesSavedObjectService());
    // Default: every rule lookup succeeds so happy-path tests don't need to wire it up.
    jest.spyOn(rulesSavedObjectService, 'get').mockResolvedValue({
      id: 'rule-default',
      attributes: {} as never,
      version: 'v1',
    });
    ({ userService, userProfileService } = createUserService());
    apiKeyService = createMockApiKeyService();
    ({ loggerService, mockLogger } = createLoggerService());
    mockEncryptedSavedObjects = createMockEncryptedSavedObjects((id) => {
      if (id === 'policy-id-update-1') return { apiKey: 'old-api-key', createdByUser: false };
      if (id === 'policy-id-update-key-1') return { apiKey: 'old-api-key', createdByUser: false };
      if (id === 'policy-id-update-key-user')
        return { apiKey: 'user-created-key', createdByUser: true };
      if (id === 'policy-id-del-1') return { apiKey: 'some-key', createdByUser: false };
      return null;
    });
    mockEsoClient = mockEncryptedSavedObjects.getClient();

    client = new ActionPolicyClient(
      actionPolicySavedObjectService,
      rulesSavedObjectService,
      userService,
      apiKeyService,
      mockEsoClient as any,
      'default',
      loggerService
    );

    userProfileService.getCurrentProfileId.mockResolvedValue('elastic_profile_uid');

    mockSavedObjectsClient.create.mockResolvedValue({
      id: 'policy-id-default',
      type: ACTION_POLICY_SAVED_OBJECT_TYPE,
      attributes: {} as ActionPolicySavedObjectAttributes,
      references: [],
      version: 'WzEsMV0=',
    });
    mockSavedObjectsClient.update.mockResolvedValue({
      id: 'policy-id-default',
      type: ACTION_POLICY_SAVED_OBJECT_TYPE,
      attributes: {} as ActionPolicySavedObjectAttributes,
      references: [],
      version: 'WzEsMV0=',
    });
    mockSavedObjectsClient.delete.mockResolvedValue({});
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('createActionPolicy', () => {
    it('creates a action policy with correct attributes including API key', async () => {
      mockSavedObjectsClient.create.mockResolvedValueOnce({
        id: 'policy-id-1',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        attributes: {} as ActionPolicySavedObjectAttributes,
        references: [],
        version: 'WzEsMV0=',
      });

      const res = await client.createActionPolicy({
        data: {
          name: 'my-policy',
          description: 'my-policy description',
          destinations: [{ type: 'workflow', id: 'my-workflow' }],
        },
        options: { id: 'policy-id-1' },
      });

      expect(apiKeyService.create).toHaveBeenCalledWith('Action Policy: my-policy');

      expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
        ACTION_POLICY_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          name: 'my-policy',
          description: 'my-policy description',
          enabled: true,
          destinations: [{ type: 'workflow', id: 'my-workflow' }],
          apiKey: 'encoded-es-api-key',
          apiKeyOwner: 'test-user',
          apiKeyCreatedByUser: false,
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
          matcher: null,
          groupBy: null,
          tags: null,
          throttle: null,
          snoozedUntil: null,
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

    it('creates a action policy without custom id', async () => {
      mockSavedObjectsClient.create.mockImplementationOnce(async (_type, _attrs, options) => {
        return {
          id: (options?.id ?? 'auto-generated-id') as string,
          type: ACTION_POLICY_SAVED_OBJECT_TYPE,
          attributes: {} as ActionPolicySavedObjectAttributes,
          references: [],
          version: 'WzEsMV0=',
        };
      });

      const res = await client.createActionPolicy({
        data: {
          name: 'my-policy',
          description: 'my-policy description',
          destinations: [{ type: 'workflow', id: 'my-workflow' }],
        },
      });

      expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
        ACTION_POLICY_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          name: 'my-policy',
          description: 'my-policy description',
          enabled: true,
          destinations: [{ type: 'workflow', id: 'my-workflow' }],
          apiKey: 'encoded-es-api-key',
          apiKeyOwner: 'test-user',
          apiKeyCreatedByUser: false,
          createdBy: 'elastic_profile_uid',
          updatedBy: 'elastic_profile_uid',
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

    it('creates a action policy with tags', async () => {
      mockSavedObjectsClient.create.mockResolvedValueOnce({
        id: 'policy-with-tags',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        attributes: {} as ActionPolicySavedObjectAttributes,
        references: [],
        version: 'WzEsMV0=',
      });

      await client.createActionPolicy({
        data: {
          name: 'tagged-policy',
          description: 'policy with tags',
          destinations: [{ type: 'workflow', id: 'my-workflow' }],
          tags: ['production', 'critical'],
        },
        options: { id: 'policy-with-tags' },
      });

      expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
        ACTION_POLICY_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          tags: ['production', 'critical'],
        }),
        expect.anything()
      );
    });

    it('stores tags as null when not provided', async () => {
      mockSavedObjectsClient.create.mockResolvedValueOnce({
        id: 'policy-no-tags',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        attributes: {} as ActionPolicySavedObjectAttributes,
        references: [],
        version: 'WzEsMV0=',
      });

      await client.createActionPolicy({
        data: {
          name: 'no-tags-policy',
          description: 'policy without tags',
          destinations: [{ type: 'workflow', id: 'my-workflow' }],
        },
        options: { id: 'policy-no-tags' },
      });

      expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
        ACTION_POLICY_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          tags: null,
        }),
        expect.anything()
      );
    });

    it('throws 400 when data is invalid', async () => {
      await expect(
        client.createActionPolicy({
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
          ACTION_POLICY_SAVED_OBJECT_TYPE,
          'policy-id-conflict'
        )
      );

      await expect(
        client.createActionPolicy({
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
        client.createActionPolicy({
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

  describe('getActionPolicy', () => {
    it('returns a action policy by id with auth.apiKey stripped', async () => {
      const existingAttributes: ActionPolicySavedObjectAttributes = {
        name: 'test-policy',
        description: 'test-policy description',
        enabled: true,
        destinations: [{ type: 'workflow', id: 'test-workflow' }],
        apiKey: 'encrypted-api-key',
        apiKeyOwner: 'test-user',
        apiKeyCreatedByUser: false,
        createdBy: 'elastic_profile_uid',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'elastic_profile_uid',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-get-1',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        attributes: existingAttributes,
        references: [],
        version: 'WzEsMV0=',
      });

      const res = await client.getActionPolicy({ id: 'policy-id-get-1' });

      expect(mockSavedObjectsClient.get).toHaveBeenCalledWith(
        ACTION_POLICY_SAVED_OBJECT_TYPE,
        'policy-id-get-1',
        undefined
      );
      expect(res.matcher).toBeNull();
      expect(res.groupBy).toBeNull();
      expect(res.throttle).toBeNull();
      expect(res.snoozedUntil).toBeNull();
      expect(res.auth).toEqual({ owner: 'test-user', createdByUser: false });
      expect(res.auth).not.toHaveProperty('apiKey');
    });

    it('throws 404 when action policy is not found', async () => {
      mockSavedObjectsClient.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          ACTION_POLICY_SAVED_OBJECT_TYPE,
          'policy-id-get-404'
        )
      );

      await expect(client.getActionPolicy({ id: 'policy-id-get-404' })).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
    });

    it('heals pre-fix documents: reads throttle.interval as null for intervalless strategy', async () => {
      const existingAttributes: ActionPolicySavedObjectAttributes = {
        name: 'stale-policy',
        description: 'stale-policy description',
        enabled: true,
        destinations: [{ type: 'workflow', id: 'test-workflow' }],
        throttle: { strategy: 'on_status_change', interval: '5m' }, // stale pre-fix state
        apiKey: 'encrypted-api-key',
        apiKeyOwner: 'test-user',
        apiKeyCreatedByUser: false,
        createdBy: 'elastic_profile_uid',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'elastic_profile_uid',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-get-stale',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        attributes: existingAttributes,
        references: [],
        version: 'WzEsMV0=',
      });

      const res = await client.getActionPolicy({ id: 'policy-id-get-stale' });

      expect(res.throttle).toEqual({ strategy: 'on_status_change', interval: null });
    });
  });

  describe('getActionPolicies', () => {
    it('returns action policies for multiple ids in input order', async () => {
      const firstAttributes: ActionPolicySavedObjectAttributes = {
        name: 'policy-two',
        description: 'policy-two description',
        enabled: true,
        destinations: [{ type: 'workflow', id: 'workflow-two' }],
        apiKey: 'secret-key-2',
        apiKeyOwner: 'user-2',
        apiKeyCreatedByUser: false,
        createdBy: 'elastic_profile_uid',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'elastic_profile_uid',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      const secondAttributes: ActionPolicySavedObjectAttributes = {
        name: 'policy-one',
        description: 'policy-one description',
        enabled: true,
        destinations: [{ type: 'workflow', id: 'workflow-one' }],
        apiKey: 'secret-key-1',
        apiKeyOwner: 'user-1',
        apiKeyCreatedByUser: false,
        createdBy: 'elastic_profile_uid',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'elastic_profile_uid',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'policy-id-get-2',
            type: ACTION_POLICY_SAVED_OBJECT_TYPE,
            attributes: firstAttributes,
            references: [],
            version: 'WzIsMV0=',
          },
          {
            id: 'policy-id-get-1',
            type: ACTION_POLICY_SAVED_OBJECT_TYPE,
            attributes: secondAttributes,
            references: [],
            version: 'WzEsMV0=',
          },
        ],
      });

      const res = await client.getActionPolicies({
        ids: ['policy-id-get-2', 'policy-id-get-1'],
      });

      expect(res).toHaveLength(2);
      expect(res[0].auth).toEqual({ owner: 'user-2', createdByUser: false });
      expect(res[0].auth).not.toHaveProperty('apiKey');
      expect(res[1].auth).toEqual({ owner: 'user-1', createdByUser: false });
      expect(res[1].auth).not.toHaveProperty('apiKey');
    });

    it('returns an empty array when ids are empty', async () => {
      const res = await client.getActionPolicies({ ids: [] });

      expect(res).toEqual([]);
    });

    it('ignores missing action policies and returns found policies', async () => {
      const firstAttributes: ActionPolicySavedObjectAttributes = {
        name: 'policy-found-one',
        description: 'policy-found-one description',
        enabled: true,
        destinations: [{ type: 'workflow', id: 'workflow-found-one' }],
        apiKey: 'key-1',
        apiKeyOwner: 'user-1',
        apiKeyCreatedByUser: false,
        createdBy: 'elastic_profile_uid',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'elastic_profile_uid',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      const thirdAttributes: ActionPolicySavedObjectAttributes = {
        name: 'policy-found-three',
        description: 'policy-found-three description',
        enabled: true,
        destinations: [{ type: 'workflow', id: 'workflow-found-three' }],
        apiKey: 'key-3',
        apiKeyOwner: 'user-3',
        apiKeyCreatedByUser: false,
        createdBy: 'elastic_profile_uid',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'elastic_profile_uid',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'policy-id-get-found-1',
            type: ACTION_POLICY_SAVED_OBJECT_TYPE,
            attributes: firstAttributes,
            references: [],
            version: 'WzEsMV0=',
          },
          {
            id: 'policy-id-get-missing',
            type: ACTION_POLICY_SAVED_OBJECT_TYPE,
            attributes: {} as ActionPolicySavedObjectAttributes,
            references: [],
            error: {
              statusCode: 404,
              error: 'Not Found',
              message: 'Saved object [action_policy/policy-id-get-missing] not found',
            },
          },
          {
            id: 'policy-id-get-found-3',
            type: ACTION_POLICY_SAVED_OBJECT_TYPE,
            attributes: thirdAttributes,
            references: [],
            version: 'WzMsMV0=',
          },
        ],
      });

      const res = await client.getActionPolicies({
        ids: ['policy-id-get-found-1', 'policy-id-get-missing', 'policy-id-get-found-3'],
      });

      expect(res).toHaveLength(2);
      expect(res[0].id).toBe('policy-id-get-found-1');
      expect(res[0].auth).not.toHaveProperty('apiKey');
      expect(res[1].id).toBe('policy-id-get-found-3');
      expect(res[1].auth).not.toHaveProperty('apiKey');
    });

    it('ignores documents with non-404 errors and returns valid documents', async () => {
      const validAttributes: ActionPolicySavedObjectAttributes = {
        name: 'policy-valid',
        description: 'policy-valid description',
        enabled: true,
        destinations: [{ type: 'workflow', id: 'workflow-valid' }],
        apiKey: 'valid-key',
        apiKeyOwner: 'valid-user',
        apiKeyCreatedByUser: false,
        createdBy: 'elastic_profile_uid',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'elastic_profile_uid',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'policy-id-valid',
            type: ACTION_POLICY_SAVED_OBJECT_TYPE,
            attributes: validAttributes,
            references: [],
            version: 'WzEsMV0=',
          },
          {
            id: 'policy-id-error-500',
            type: ACTION_POLICY_SAVED_OBJECT_TYPE,
            attributes: {} as ActionPolicySavedObjectAttributes,
            references: [],
            error: {
              statusCode: 500,
              error: 'Internal Server Error',
              message: 'Something went wrong',
            },
          },
        ],
      });

      const res = await client.getActionPolicies({
        ids: ['policy-id-valid', 'policy-id-error-500'],
      });

      expect(res).toHaveLength(1);
      expect(res[0].id).toBe('policy-id-valid');
      expect(res[0].auth).toEqual({ owner: 'valid-user', createdByUser: false });
      expect(res[0].auth).not.toHaveProperty('apiKey');
    });
  });

  describe('findActionPolicies', () => {
    const makeFindResponse = (
      items: Array<{
        id: string;
        attributes: ActionPolicySavedObjectAttributes;
        version?: string;
      }>,
      total?: number
    ) => ({
      saved_objects: items.map((item) => ({
        id: item.id,
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
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

    const policyAttributes: ActionPolicySavedObjectAttributes = {
      name: 'find-policy',
      description: 'find-policy description',
      enabled: true,
      destinations: [{ type: 'workflow', id: 'find-workflow' }],
      apiKey: 'secret-find-key',
      apiKeyOwner: 'find-user',
      apiKeyCreatedByUser: false,
      createdBy: 'elastic_profile_uid',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedBy: 'elastic_profile_uid',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };

    it('returns items with auth.apiKey stripped', async () => {
      mockSavedObjectsClient.find.mockResolvedValueOnce(
        makeFindResponse([{ id: 'policy-find-1', attributes: policyAttributes }])
      );

      const res = await client.findActionPolicies();

      expect(res.items).toHaveLength(1);
      expect(res.items[0].matcher).toBeNull();
      expect(res.items[0].groupBy).toBeNull();
      expect(res.items[0].throttle).toBeNull();
      expect(res.items[0].snoozedUntil).toBeNull();
      expect(res.items[0].auth).toEqual({ owner: 'find-user', createdByUser: false });
      expect(res.items[0].auth).not.toHaveProperty('apiKey');
    });

    it('uses default pagination when no params provided', async () => {
      mockSavedObjectsClient.find.mockResolvedValueOnce(makeFindResponse([]));

      const res = await client.findActionPolicies();

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ACTION_POLICY_SAVED_OBJECT_TYPE,
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

      await client.findActionPolicies({ page: 3, perPage: 5 });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 3,
          perPage: 5,
        })
      );
    });

    it('forwards search parameter with search fields and AND operator', async () => {
      mockSavedObjectsClient.find.mockResolvedValueOnce(makeFindResponse([]));

      await client.findActionPolicies({ search: 'my-search' });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'my\\-search*',
          searchFields: ['name', 'description'],
          defaultSearchOperator: 'AND',
        })
      );
    });

    it('escapes operators and appends prefix wildcard to each search token', async () => {
      mockSavedObjectsClient.find.mockResolvedValueOnce(makeFindResponse([]));

      await client.findActionPolicies({ search: 'memory-alert-rule' });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'memory\\-alert\\-rule*',
          searchFields: ['name', 'description'],
          defaultSearchOperator: 'AND',
        })
      );
    });

    it('handles multi-word search by tokenizing and escaping each word', async () => {
      mockSavedObjectsClient.find.mockResolvedValueOnce(makeFindResponse([]));

      await client.findActionPolicies({ search: 'prod alerts' });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'prod* alerts*',
          searchFields: ['name', 'description'],
          defaultSearchOperator: 'AND',
        })
      );
    });

    it('does not pass search fields when search is empty', async () => {
      mockSavedObjectsClient.find.mockResolvedValueOnce(makeFindResponse([]));

      await client.findActionPolicies({ search: '   ' });

      const callArgs = mockSavedObjectsClient.find.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty('search');
      expect(callArgs).not.toHaveProperty('searchFields');
      expect(callArgs).not.toHaveProperty('defaultSearchOperator');
    });

    it('builds KQL filter for enabled=true', async () => {
      mockSavedObjectsClient.find.mockResolvedValueOnce(makeFindResponse([]));

      await client.findActionPolicies({ enabled: true });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({ type: 'function' }),
        })
      );
    });

    it('builds KQL filter for tags', async () => {
      mockSavedObjectsClient.find.mockResolvedValueOnce(makeFindResponse([]));

      await client.findActionPolicies({ tags: ['production', 'critical'] });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({ type: 'function' }),
        })
      );
    });

    it('builds KQL filter for a single tag', async () => {
      mockSavedObjectsClient.find.mockResolvedValueOnce(makeFindResponse([]));

      await client.findActionPolicies({ tags: ['production'] });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({ type: 'function' }),
        })
      );
    });

    it('does not build a filter for empty tags array', async () => {
      mockSavedObjectsClient.find.mockResolvedValueOnce(makeFindResponse([]));

      await client.findActionPolicies({ tags: [] });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: undefined,
        })
      );
    });

    it('builds KQL filter for enabled=false', async () => {
      mockSavedObjectsClient.find.mockResolvedValueOnce(makeFindResponse([]));

      await client.findActionPolicies({ enabled: false });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({ type: 'function' }),
        })
      );
    });

    it('maps sort field name to name.keyword', async () => {
      mockSavedObjectsClient.find.mockResolvedValueOnce(makeFindResponse([]));

      await client.findActionPolicies({ sortField: 'name', sortOrder: 'asc' });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          sortField: 'name.keyword',
          sortOrder: 'asc',
        })
      );
    });

    it('maps sort field createdAt to the saved object root created_at', async () => {
      mockSavedObjectsClient.find.mockResolvedValueOnce(makeFindResponse([]));

      await client.findActionPolicies({ sortField: 'createdAt', sortOrder: 'desc' });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          sortField: 'created_at',
          sortOrder: 'desc',
        })
      );
    });

    it('maps sort field updatedAt to the saved object root updated_at', async () => {
      mockSavedObjectsClient.find.mockResolvedValueOnce(makeFindResponse([]));

      await client.findActionPolicies({ sortField: 'updatedAt', sortOrder: 'asc' });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          sortField: 'updated_at',
          sortOrder: 'asc',
        })
      );
    });

    it('returns multiple items with correct structure', async () => {
      const secondAttributes: ActionPolicySavedObjectAttributes = {
        ...policyAttributes,
        name: 'find-policy-2',
        apiKey: 'another-secret-key',
        apiKeyOwner: 'another-user',
        apiKeyCreatedByUser: true,
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

      const res = await client.findActionPolicies();

      expect(res.items).toHaveLength(2);
      expect(res.total).toBe(2);

      expect(res.items[0].id).toBe('policy-find-1');
      expect(res.items[0].name).toBe('find-policy');
      expect(res.items[0].auth).toEqual({ owner: 'find-user', createdByUser: false });
      expect(res.items[0].auth).not.toHaveProperty('apiKey');

      expect(res.items[1].id).toBe('policy-find-2');
      expect(res.items[1].name).toBe('find-policy-2');
      expect(res.items[1].auth).toEqual({ owner: 'another-user', createdByUser: true });
      expect(res.items[1].auth).not.toHaveProperty('apiKey');
    });
  });

  describe('updateActionPolicy', () => {
    it('clears nullable fields with null values', async () => {
      const existingAttributes: ActionPolicySavedObjectAttributes = {
        name: 'original-policy',
        description: 'original-policy description',
        enabled: true,
        destinations: [{ type: 'workflow', id: 'original-workflow' }],
        matcher: 'event.severity: critical',
        groupBy: ['host.name'],
        throttle: { interval: '1h' },
        apiKey: 'old-api-key',
        apiKeyOwner: 'old-user',
        apiKeyCreatedByUser: false,
        createdBy: 'creator_profile_uid',
        createdAt: '2024-12-01T00:00:00.000Z',
        updatedBy: 'updater_profile_uid',
        updatedAt: '2024-12-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-update-1',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
        version: 'WzEsMV0=',
        attributes: existingAttributes,
      });
      mockSavedObjectsClient.update.mockResolvedValueOnce({
        id: 'policy-id-update-1',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        attributes: {} as ActionPolicySavedObjectAttributes,
        references: [],
        version: 'WzIsMV0=',
      });

      const res = await client.updateActionPolicy({
        data: {
          matcher: null,
          groupBy: null,
          tags: null,
          throttle: null,
        },
        options: { id: 'policy-id-update-1', version: 'WzEsMV0=' },
      });

      expect(apiKeyService.create).toHaveBeenCalledWith('Action Policy: original-policy');
      expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
        ACTION_POLICY_SAVED_OBJECT_TYPE,
        'policy-id-update-1',
        expect.objectContaining({
          name: 'original-policy',
          description: 'original-policy description',
          destinations: [{ type: 'workflow', id: 'original-workflow' }],
          matcher: null,
          groupBy: null,
          tags: null,
          throttle: null,
        }),
        { version: 'WzEsMV0=' }
      );
      expect(res.matcher).toBeNull();
      expect(res.groupBy).toBeNull();
      expect(res.throttle).toBeNull();
      expect(res.snoozedUntil).toBeNull();
    });

    it('nulls throttle.interval when transitioning to an intervalless strategy', async () => {
      const existingAttributes: ActionPolicySavedObjectAttributes = {
        name: 'transition-policy',
        description: 'transition-policy description',
        enabled: true,
        destinations: [{ type: 'workflow', id: 'wf-1' }],
        groupingMode: 'per_episode',
        throttle: { strategy: 'per_status_interval', interval: '10m' },
        apiKey: 'old-api-key',
        apiKeyOwner: 'old-user',
        apiKeyCreatedByUser: false,
        createdBy: 'creator_profile_uid',
        createdAt: '2024-12-01T00:00:00.000Z',
        updatedBy: 'updater_profile_uid',
        updatedAt: '2024-12-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-update-1',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
        version: 'WzEsMV0=',
        attributes: existingAttributes,
      });
      mockSavedObjectsClient.update.mockResolvedValueOnce({
        id: 'policy-id-update-1',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        attributes: {
          ...existingAttributes,
          throttle: { strategy: 'on_status_change', interval: null },
        },
        references: [],
        version: 'WzIsMV0=',
      });

      const res = await client.updateActionPolicy({
        data: { throttle: { strategy: 'on_status_change' } },
        options: { id: 'policy-id-update-1', version: 'WzEsMV0=' },
      });

      expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
        ACTION_POLICY_SAVED_OBJECT_TYPE,
        'policy-id-update-1',
        expect.objectContaining({
          throttle: { strategy: 'on_status_change', interval: null },
        }),
        { version: 'WzEsMV0=' }
      );
      expect(res.throttle).toEqual({ strategy: 'on_status_change', interval: null });
    });

    it('preserves throttle.interval for interval-requiring strategies', async () => {
      const existingAttributes: ActionPolicySavedObjectAttributes = {
        name: 'keep-interval-policy',
        description: 'keep-interval-policy description',
        enabled: true,
        destinations: [{ type: 'workflow', id: 'wf-1' }],
        groupingMode: 'per_episode',
        throttle: { strategy: 'on_status_change', interval: null },
        apiKey: 'old-api-key',
        apiKeyOwner: 'old-user',
        apiKeyCreatedByUser: false,
        createdBy: 'creator_profile_uid',
        createdAt: '2024-12-01T00:00:00.000Z',
        updatedBy: 'updater_profile_uid',
        updatedAt: '2024-12-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-update-1',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
        version: 'WzEsMV0=',
        attributes: existingAttributes,
      });
      mockSavedObjectsClient.update.mockResolvedValueOnce({
        id: 'policy-id-update-1',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        attributes: {
          ...existingAttributes,
          throttle: { strategy: 'per_status_interval', interval: '5m' },
        },
        references: [],
        version: 'WzIsMV0=',
      });

      const res = await client.updateActionPolicy({
        data: { throttle: { strategy: 'per_status_interval', interval: '5m' } },
        options: { id: 'policy-id-update-1', version: 'WzEsMV0=' },
      });

      expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
        ACTION_POLICY_SAVED_OBJECT_TYPE,
        'policy-id-update-1',
        expect.objectContaining({
          throttle: { strategy: 'per_status_interval', interval: '5m' },
        }),
        { version: 'WzEsMV0=' }
      );
      expect(res.throttle).toEqual({ strategy: 'per_status_interval', interval: '5m' });
    });

    it('updates a action policy and rotates the API key', async () => {
      const existingAttributes: ActionPolicySavedObjectAttributes = {
        name: 'original-policy',
        description: 'original-policy description',
        enabled: true,
        destinations: [{ type: 'workflow', id: 'original-workflow' }],
        apiKey: 'old-api-key',
        apiKeyOwner: 'old-user',
        apiKeyCreatedByUser: false,
        createdBy: 'creator_profile_uid',
        createdAt: '2024-12-01T00:00:00.000Z',
        updatedBy: 'updater_profile_uid',
        updatedAt: '2024-12-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-update-1',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
        version: 'WzEsMV0=',
        attributes: existingAttributes,
      });
      mockSavedObjectsClient.update.mockResolvedValueOnce({
        id: 'policy-id-update-1',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        attributes: {} as ActionPolicySavedObjectAttributes,
        references: [],
        version: 'WzIsMV0=',
      });

      const res = await client.updateActionPolicy({
        data: {
          name: 'updated-policy',
          destinations: [{ type: 'workflow', id: 'updated-workflow' }],
        },
        options: { id: 'policy-id-update-1', version: 'WzEsMV0=' },
      });

      expect(apiKeyService.create).toHaveBeenCalledWith('Action Policy: updated-policy');

      expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
        ACTION_POLICY_SAVED_OBJECT_TYPE,
        'policy-id-update-1',
        expect.objectContaining({
          name: 'updated-policy',
          description: 'original-policy description',
          destinations: [{ type: 'workflow', id: 'updated-workflow' }],
          apiKey: 'encoded-es-api-key',
          apiKeyOwner: 'test-user',
          apiKeyCreatedByUser: false,
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

    it('preserves existing tags when tags is not provided in update', async () => {
      const existingAttributes: ActionPolicySavedObjectAttributes = {
        name: 'tagged-policy',
        description: 'a policy with tags',
        enabled: true,
        destinations: [{ type: 'workflow', id: 'wf-1' }],
        tags: ['production', 'critical'],
        apiKey: 'old-api-key',
        apiKeyOwner: 'old-user',
        apiKeyCreatedByUser: false,
        createdBy: 'creator_profile_uid',
        createdAt: '2024-12-01T00:00:00.000Z',
        updatedBy: 'updater_profile_uid',
        updatedAt: '2024-12-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-update-1',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
        version: 'WzEsMV0=',
        attributes: existingAttributes,
      });
      mockSavedObjectsClient.update.mockResolvedValueOnce({
        id: 'policy-id-update-1',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        attributes: {} as ActionPolicySavedObjectAttributes,
        references: [],
        version: 'WzIsMV0=',
      });

      await client.updateActionPolicy({
        data: { name: 'renamed-policy' },
        options: { id: 'policy-id-update-1', version: 'WzEsMV0=' },
      });

      expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
        ACTION_POLICY_SAVED_OBJECT_TYPE,
        'policy-id-update-1',
        expect.objectContaining({
          tags: ['production', 'critical'],
        }),
        expect.anything()
      );
    });

    it('replaces tags when tags is provided in update', async () => {
      const existingAttributes: ActionPolicySavedObjectAttributes = {
        name: 'tagged-policy',
        description: 'a policy with tags',
        enabled: true,
        destinations: [{ type: 'workflow', id: 'wf-1' }],
        tags: ['production'],
        apiKey: 'old-api-key',
        apiKeyOwner: 'old-user',
        apiKeyCreatedByUser: false,
        createdBy: 'creator_profile_uid',
        createdAt: '2024-12-01T00:00:00.000Z',
        updatedBy: 'updater_profile_uid',
        updatedAt: '2024-12-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-update-1',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
        version: 'WzEsMV0=',
        attributes: existingAttributes,
      });
      mockSavedObjectsClient.update.mockResolvedValueOnce({
        id: 'policy-id-update-1',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        attributes: {} as ActionPolicySavedObjectAttributes,
        references: [],
        version: 'WzIsMV0=',
      });

      await client.updateActionPolicy({
        data: { tags: ['staging', 'low-priority'] },
        options: { id: 'policy-id-update-1', version: 'WzEsMV0=' },
      });

      expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
        ACTION_POLICY_SAVED_OBJECT_TYPE,
        'policy-id-update-1',
        expect.objectContaining({
          tags: ['staging', 'low-priority'],
        }),
        expect.anything()
      );
    });

    it('does not call invalidation for old key when decrypted policy has createdByUser: true', async () => {
      const existingAttributes: ActionPolicySavedObjectAttributes = {
        name: 'original-policy',
        description: 'original-policy description',
        enabled: true,
        destinations: [{ type: 'workflow', id: 'original-workflow' }],
        apiKey: 'old-api-key',
        apiKeyOwner: 'old-user',
        apiKeyCreatedByUser: true,
        createdBy: 'creator_profile_uid',
        createdAt: '2024-12-01T00:00:00.000Z',
        updatedBy: 'updater_profile_uid',
        updatedAt: '2024-12-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-update-1',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
        version: 'WzEsMV0=',
        attributes: existingAttributes,
      });
      mockSavedObjectsClient.update.mockResolvedValueOnce({
        id: 'policy-id-update-1',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        attributes: {} as ActionPolicySavedObjectAttributes,
        references: [],
        version: 'WzIsMV0=',
      });
      const esoClient = mockEncryptedSavedObjects.getClient();
      (esoClient.getDecryptedAsInternalUser as jest.Mock).mockResolvedValueOnce({
        id: 'policy-id-update-1',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        attributes: {
          apiKey: 'old-api-key',
          apiKeyCreatedByUser: true,
          apiKeyOwner: 'test-user',
        },
        references: [],
      });

      await client.updateActionPolicy({
        data: {
          name: 'updated-policy',
          destinations: [{ type: 'workflow', id: 'updated-workflow' }],
        },
        options: { id: 'policy-id-update-1', version: 'WzEsMV0=' },
      });

      expect(apiKeyService.markApiKeysForInvalidation).not.toHaveBeenCalled();
    });

    it('when update throws, calls invalidation with the new (unused) key', async () => {
      const existingAttributes: ActionPolicySavedObjectAttributes = {
        name: 'original-policy',
        description: 'original-policy description',
        enabled: true,
        destinations: [{ type: 'workflow', id: 'original-workflow' }],
        apiKey: 'old-api-key',
        apiKeyOwner: 'old-user',
        apiKeyCreatedByUser: false,
        createdBy: 'creator_profile_uid',
        createdAt: '2024-12-01T00:00:00.000Z',
        updatedBy: 'updater_profile_uid',
        updatedAt: '2024-12-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-update-throw',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
        version: 'WzEsMV0=',
        attributes: existingAttributes,
      });
      mockSavedObjectsClient.update.mockRejectedValueOnce(new Error('storage error'));
      const esoClient = mockEncryptedSavedObjects.getClient();
      (esoClient.getDecryptedAsInternalUser as jest.Mock).mockResolvedValueOnce({
        id: 'policy-id-update-throw',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        attributes: {
          apiKey: 'old-api-key',
          apiKeyCreatedByUser: false,
          apiKeyOwner: 'test-user',
        },
        references: [],
      });

      await expect(
        client.updateActionPolicy({
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
      const existingAttributes: ActionPolicySavedObjectAttributes = {
        name: 'original-policy',
        description: 'original-policy description',
        enabled: true,
        destinations: [{ type: 'workflow', id: 'original-workflow' }],
        apiKeyOwner: 'old-user',
        apiKeyCreatedByUser: false,
        createdBy: 'creator_profile_uid',
        createdAt: '2024-12-01T00:00:00.000Z',
        updatedBy: 'updater_profile_uid',
        updatedAt: '2024-12-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-update-no-key',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
        version: 'WzEsMV0=',
        attributes: existingAttributes,
      });
      mockSavedObjectsClient.update.mockResolvedValueOnce({
        id: 'policy-id-update-no-key',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        attributes: {} as ActionPolicySavedObjectAttributes,
        references: [],
        version: 'WzIsMV0=',
      });
      const esoClient = mockEncryptedSavedObjects.getClient();
      (esoClient.getDecryptedAsInternalUser as jest.Mock).mockResolvedValueOnce({
        id: 'policy-id-update-no-key',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        attributes: {
          apiKeyCreatedByUser: false,
          apiKeyOwner: 'test-user',
        },
        references: [],
      });

      await client.updateActionPolicy({
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
        client.updateActionPolicy({
          data: { destinations: [] },
          options: { id: 'policy-id-update-invalid', version: 'WzEsMV0=' },
        })
      ).rejects.toMatchObject({
        output: { statusCode: 400 },
      });

      expect(mockSavedObjectsClient.get).not.toHaveBeenCalled();
      expect(mockSavedObjectsClient.update).not.toHaveBeenCalled();
    });

    it('throws 404 when action policy is not found', async () => {
      mockSavedObjectsClient.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          ACTION_POLICY_SAVED_OBJECT_TYPE,
          'policy-id-update-404'
        )
      );

      await expect(
        client.updateActionPolicy({
          data: { destinations: [{ type: 'workflow', id: 'some-workflow' }] },
          options: { id: 'policy-id-update-404', version: 'WzEsMV0=' },
        })
      ).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
    });

    it('throws 409 conflict when version is stale', async () => {
      const existingAttributes: ActionPolicySavedObjectAttributes = {
        name: 'original-policy',
        description: 'original-policy description',
        enabled: true,
        destinations: [{ type: 'workflow', id: 'original-workflow' }],
        apiKey: 'old-api-key',
        apiKeyOwner: 'old-user',
        apiKeyCreatedByUser: false,
        createdBy: 'creator_profile_uid',
        createdAt: '2024-12-01T00:00:00.000Z',
        updatedBy: 'updater_profile_uid',
        updatedAt: '2024-12-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-conflict',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
        version: 'WzEsMV0=',
        attributes: existingAttributes,
      });

      mockSavedObjectsClient.update.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createConflictError(
          ACTION_POLICY_SAVED_OBJECT_TYPE,
          'policy-id-conflict'
        )
      );

      await expect(
        client.updateActionPolicy({
          data: { destinations: [{ type: 'workflow', id: 'new-workflow' }] },
          options: { id: 'policy-id-conflict', version: 'WzEsMV0=' },
        })
      ).rejects.toMatchObject({
        output: { statusCode: 409 },
      });

      expect(apiKeyService.markApiKeysForInvalidation).toHaveBeenCalledWith(['encoded-es-api-key']);
    });
  });

  describe('upsertActionPolicy', () => {
    const baseUpsertData = {
      name: 'upsert-policy',
      description: 'upsert-policy description',
      destinations: [{ type: 'workflow' as const, id: 'wf-upsert' }],
    };

    describe('create action policy (id does not exist)', () => {
      beforeEach(() => {
        mockSavedObjectsClient.get.mockRejectedValueOnce(
          SavedObjectsErrorHelpers.createGenericNotFoundError(
            ACTION_POLICY_SAVED_OBJECT_TYPE,
            'policy-id-upsert-new'
          )
        );
      });

      it('creates the policy with a fresh API key and audit fields', async () => {
        mockSavedObjectsClient.create.mockResolvedValueOnce({
          id: 'policy-id-upsert-new',
          type: ACTION_POLICY_SAVED_OBJECT_TYPE,
          attributes: {} as ActionPolicySavedObjectAttributes,
          references: [],
          version: 'WzEsMV0=',
        });

        const res = await client.upsertActionPolicy({
          id: 'policy-id-upsert-new',
          data: baseUpsertData,
        });

        expect(apiKeyService.create).toHaveBeenCalledWith('Action Policy: upsert-policy');
        expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
          ACTION_POLICY_SAVED_OBJECT_TYPE,
          expect.objectContaining({
            name: 'upsert-policy',
            enabled: true,
            apiKey: 'encoded-es-api-key',
            apiKeyOwner: 'test-user',
            apiKeyCreatedByUser: false,
            createdBy: 'elastic_profile_uid',
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedBy: 'elastic_profile_uid',
            updatedAt: '2025-01-01T00:00:00.000Z',
          }),
          { id: 'policy-id-upsert-new', overwrite: false }
        );
        expect(res).toEqual({
          created: true,
          policy: expect.objectContaining({
            id: 'policy-id-upsert-new',
            name: 'upsert-policy',
            enabled: true,
            snoozedUntil: null,
          }),
        });
        expect(res.policy.auth).not.toHaveProperty('apiKey');
        expect(apiKeyService.markApiKeysForInvalidation).not.toHaveBeenCalled();
      });

      it('invalidates the new API key and throws 409 when another caller wins the race', async () => {
        mockSavedObjectsClient.create.mockRejectedValueOnce(
          SavedObjectsErrorHelpers.createConflictError(
            ACTION_POLICY_SAVED_OBJECT_TYPE,
            'policy-id-upsert-new'
          )
        );

        await expect(
          client.upsertActionPolicy({ id: 'policy-id-upsert-new', data: baseUpsertData })
        ).rejects.toMatchObject({
          output: { statusCode: 409 },
        });

        expect(apiKeyService.markApiKeysForInvalidation).toHaveBeenCalledWith([
          'encoded-es-api-key',
        ]);
      });
    });

    describe('replace action policy (id exists)', () => {
      const existingAttributes: ActionPolicySavedObjectAttributes = {
        name: 'before',
        description: 'before description',
        enabled: false,
        destinations: [{ type: 'workflow', id: 'wf-before' }],
        matcher: 'env: production',
        groupBy: ['host.name'],
        snoozedUntil: '2099-01-01T00:00:00.000Z',
        apiKey: 'old-api-key',
        apiKeyOwner: 'old-user',
        apiKeyCreatedByUser: false,
        createdBy: 'previous_creator_uid',
        createdAt: '2024-06-01T00:00:00.000Z',
        updatedBy: 'previous_updater_uid',
        updatedAt: '2024-06-01T00:00:00.000Z',
      };

      beforeEach(() => {
        // upsertActionPolicy reads the existing policy twice — once for the
        // existence check and again to load the immutable/audit context — so
        // both `get` calls must resolve to the same SO.
        const existingDoc = {
          id: 'policy-id-update-1',
          type: ACTION_POLICY_SAVED_OBJECT_TYPE,
          references: [],
          version: 'WzEsMV0=',
          attributes: existingAttributes,
        };
        mockSavedObjectsClient.get
          .mockResolvedValueOnce(existingDoc)
          .mockResolvedValueOnce(existingDoc);
      });

      it('replaces create-schema fields, preserves audit + operational state, rotates the API key', async () => {
        mockSavedObjectsClient.update.mockResolvedValueOnce({
          id: 'policy-id-update-1',
          type: ACTION_POLICY_SAVED_OBJECT_TYPE,
          attributes: {} as ActionPolicySavedObjectAttributes,
          references: [],
          version: 'WzIsMV0=',
        });

        const res = await client.upsertActionPolicy({
          id: 'policy-id-update-1',
          data: {
            name: 'after',
            description: 'after description',
            destinations: baseUpsertData.destinations,
          },
        });

        expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
          ACTION_POLICY_SAVED_OBJECT_TYPE,
          'policy-id-update-1',
          expect.objectContaining({
            // Replaced fields take new values from the body.
            name: 'after',
            description: 'after description',
            destinations: [{ type: 'workflow', id: 'wf-upsert' }],
            // Operational state is preserved.
            enabled: false,
            snoozedUntil: '2099-01-01T00:00:00.000Z',
            // Audit metadata is preserved on the create side.
            createdBy: 'previous_creator_uid',
            createdAt: '2024-06-01T00:00:00.000Z',
            // Audit metadata advances on the update side.
            updatedBy: 'elastic_profile_uid',
            updatedAt: '2025-01-01T00:00:00.000Z',
            // API key is the freshly minted one.
            apiKey: 'encoded-es-api-key',
            apiKeyOwner: 'test-user',
            apiKeyCreatedByUser: false,
          }),
          { version: 'WzEsMV0=' }
        );

        // Old key invalidated AFTER successful SO update.
        expect(apiKeyService.markApiKeysForInvalidation).toHaveBeenCalledWith(['old-api-key']);
        expect(res.created).toBe(false);
        expect(res.policy.auth).not.toHaveProperty('apiKey');
      });

      it('invalidates the new API key and throws 409 when version is stale', async () => {
        mockSavedObjectsClient.update.mockRejectedValueOnce(
          SavedObjectsErrorHelpers.createConflictError(
            ACTION_POLICY_SAVED_OBJECT_TYPE,
            'policy-id-update-1'
          )
        );

        await expect(
          client.upsertActionPolicy({ id: 'policy-id-update-1', data: baseUpsertData })
        ).rejects.toMatchObject({
          output: { statusCode: 409 },
        });

        // The freshly minted key is invalidated, the old key is not (it's still in use).
        expect(apiKeyService.markApiKeysForInvalidation).toHaveBeenCalledWith([
          'encoded-es-api-key',
        ]);
        expect(apiKeyService.markApiKeysForInvalidation).not.toHaveBeenCalledWith(['old-api-key']);
      });
    });

    it('rethrows non-not-found errors from the existing-policy lookup', async () => {
      mockSavedObjectsClient.get.mockRejectedValueOnce(new Error('elasticsearch unavailable'));

      await expect(
        client.upsertActionPolicy({ id: 'policy-id-upsert-fatal', data: baseUpsertData })
      ).rejects.toThrow('elasticsearch unavailable');

      expect(apiKeyService.create).not.toHaveBeenCalled();
      expect(mockSavedObjectsClient.create).not.toHaveBeenCalled();
      expect(mockSavedObjectsClient.update).not.toHaveBeenCalled();
    });

    it('throws 400 when the body is invalid', async () => {
      await expect(
        client.upsertActionPolicy({
          id: 'policy-id-upsert-bad',
          data: { ...baseUpsertData, destinations: [] },
        })
      ).rejects.toMatchObject({
        output: { statusCode: 400 },
      });

      expect(mockSavedObjectsClient.get).not.toHaveBeenCalled();
      expect(apiKeyService.create).not.toHaveBeenCalled();
    });
  });

  describe('updateActionPolicyApiKey', () => {
    const existingAttributes: ActionPolicySavedObjectAttributes = {
      name: 'existing-policy',
      description: 'existing-policy description',
      enabled: true,
      destinations: [{ type: 'workflow', id: 'existing-workflow' }],
      apiKey: 'old-api-key',
      apiKeyOwner: 'old-user',
      apiKeyCreatedByUser: false,
      createdBy: 'creator_profile_uid',
      createdAt: '2024-12-01T00:00:00.000Z',
      updatedBy: 'updater_profile_uid',
      updatedAt: '2024-12-01T00:00:00.000Z',
    };

    it('creates a new API key, updates only auth and updatedBy fields, and invalidates the old key', async () => {
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-update-key-1',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
        version: 'WzEsMV0=',
        attributes: existingAttributes,
      });

      await client.updateActionPolicyApiKey({ id: 'policy-id-update-key-1' });

      expect(apiKeyService.create).toHaveBeenCalledWith('Action Policy: existing-policy');

      expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
        ACTION_POLICY_SAVED_OBJECT_TYPE,
        'policy-id-update-key-1',
        expect.objectContaining({
          apiKey: 'encoded-es-api-key',
          apiKeyOwner: 'test-user',
          apiKeyCreatedByUser: false,
          updatedBy: 'elastic_profile_uid',
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
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
        version: 'WzEsMV0=',
        attributes: {
          ...existingAttributes,
          apiKey: 'user-created-key',
          apiKeyOwner: 'old-user',
          apiKeyCreatedByUser: true,
        },
      });

      await client.updateActionPolicyApiKey({ id: 'policy-id-update-key-user' });

      expect(apiKeyService.create).toHaveBeenCalled();
      expect(apiKeyService.markApiKeysForInvalidation).not.toHaveBeenCalled();
    });

    it('throws 404 when action policy is not found', async () => {
      mockSavedObjectsClient.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          ACTION_POLICY_SAVED_OBJECT_TYPE,
          'policy-id-not-found'
        )
      );

      await expect(
        client.updateActionPolicyApiKey({ id: 'policy-id-not-found' })
      ).rejects.toMatchObject({
        output: { statusCode: 404 },
      });

      expect(apiKeyService.create).not.toHaveBeenCalled();
    });

    it('invalidates new API key and throws when update fails', async () => {
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-update-key-1',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
        version: 'WzEsMV0=',
        attributes: existingAttributes,
      });
      mockSavedObjectsClient.update.mockRejectedValueOnce(new Error('storage error'));

      await expect(
        client.updateActionPolicyApiKey({ id: 'policy-id-update-key-1' })
      ).rejects.toThrow('storage error');

      expect(apiKeyService.markApiKeysForInvalidation).toHaveBeenCalledWith(['encoded-es-api-key']);
    });

    it('throws 409 conflict when saved object version conflict occurs', async () => {
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-update-key-1',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
        version: 'WzEsMV0=',
        attributes: existingAttributes,
      });
      mockSavedObjectsClient.update.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createConflictError(
          ACTION_POLICY_SAVED_OBJECT_TYPE,
          'policy-id-update-key-1'
        )
      );

      await expect(
        client.updateActionPolicyApiKey({ id: 'policy-id-update-key-1' })
      ).rejects.toMatchObject({
        output: { statusCode: 409 },
      });

      expect(apiKeyService.markApiKeysForInvalidation).toHaveBeenCalledWith(['encoded-es-api-key']);
    });
  });

  describe('enableActionPolicy', () => {
    const updatedAttributes: ActionPolicySavedObjectAttributes = {
      name: 'snoozed-policy',
      description: 'snoozed-policy description',
      enabled: true,
      destinations: [{ type: 'workflow', id: 'test-workflow' }],
      apiKey: 'some-key',
      apiKeyOwner: 'test-user',
      apiKeyCreatedByUser: false,
      createdBy: 'elastic_profile_uid',
      createdAt: '2024-12-01T00:00:00.000Z',
      updatedBy: 'elastic_profile_uid',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };

    it('does a partial update then fetches the full policy', async () => {
      mockSavedObjectsClient.update.mockResolvedValueOnce({
        id: 'policy-id-enable',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        attributes: {} as ActionPolicySavedObjectAttributes,
        references: [],
        version: 'WzIsMV0=',
      });
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-enable',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        attributes: updatedAttributes,
        references: [],
        version: 'WzIsMV0=',
      });

      const res = await client.enableActionPolicy({ id: 'policy-id-enable' });

      expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
        ACTION_POLICY_SAVED_OBJECT_TYPE,
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
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        attributes: {} as ActionPolicySavedObjectAttributes,
        references: [],
      });
      mockSavedObjectsClient.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          ACTION_POLICY_SAVED_OBJECT_TYPE,
          'policy-id-enable-404'
        )
      );

      await expect(client.enableActionPolicy({ id: 'policy-id-enable-404' })).rejects.toMatchObject(
        {
          output: { statusCode: 404 },
        }
      );
    });

    it('throws 404 when update rejects with NotFoundError', async () => {
      mockSavedObjectsClient.update.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          ACTION_POLICY_SAVED_OBJECT_TYPE,
          'policy-id-enable-update-404'
        )
      );

      await expect(
        client.enableActionPolicy({ id: 'policy-id-enable-update-404' })
      ).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
    });

    it('throws 409 when update rejects with ConflictError', async () => {
      mockSavedObjectsClient.update.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createConflictError(
          ACTION_POLICY_SAVED_OBJECT_TYPE,
          'policy-id-enable-conflict'
        )
      );

      await expect(
        client.enableActionPolicy({ id: 'policy-id-enable-conflict' })
      ).rejects.toMatchObject({
        output: { statusCode: 409 },
      });
    });
  });

  describe('disableActionPolicy', () => {
    it('does a partial update with enabled=false', async () => {
      const updatedAttributes: ActionPolicySavedObjectAttributes = {
        name: 'active-policy',
        description: 'active-policy description',
        enabled: false,
        destinations: [{ type: 'workflow', id: 'test-workflow' }],
        apiKey: 'some-key',
        apiKeyOwner: 'test-user',
        apiKeyCreatedByUser: false,
        createdBy: 'elastic_profile_uid',
        createdAt: '2024-12-01T00:00:00.000Z',
        updatedBy: 'elastic_profile_uid',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.update.mockResolvedValueOnce({
        id: 'policy-id-disable',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        attributes: {} as ActionPolicySavedObjectAttributes,
        references: [],
        version: 'WzIsMV0=',
      });
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-disable',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        attributes: updatedAttributes,
        references: [],
        version: 'WzIsMV0=',
      });

      const res = await client.disableActionPolicy({ id: 'policy-id-disable' });

      expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
        ACTION_POLICY_SAVED_OBJECT_TYPE,
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

    it('throws 404 when update rejects with NotFoundError', async () => {
      mockSavedObjectsClient.update.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          ACTION_POLICY_SAVED_OBJECT_TYPE,
          'policy-id-disable-404'
        )
      );

      await expect(
        client.disableActionPolicy({ id: 'policy-id-disable-404' })
      ).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
    });
  });

  describe('snoozeActionPolicy', () => {
    it('does a partial update with snoozedUntil', async () => {
      const updatedAttributes: ActionPolicySavedObjectAttributes = {
        name: 'active-policy',
        description: 'active-policy description',
        enabled: true,
        destinations: [{ type: 'workflow', id: 'test-workflow' }],
        snoozedUntil: '2025-06-01T12:00:00.000Z',
        apiKey: 'some-key',
        apiKeyOwner: 'test-user',
        apiKeyCreatedByUser: false,
        createdBy: 'elastic_profile_uid',
        createdAt: '2024-12-01T00:00:00.000Z',
        updatedBy: 'elastic_profile_uid',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.update.mockResolvedValueOnce({
        id: 'policy-id-snooze',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        attributes: {} as ActionPolicySavedObjectAttributes,
        references: [],
        version: 'WzIsMV0=',
      });
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-snooze',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        attributes: updatedAttributes,
        references: [],
        version: 'WzIsMV0=',
      });

      const res = await client.snoozeActionPolicy({
        id: 'policy-id-snooze',
        snoozedUntil: '2025-06-01T12:00:00.000Z',
      });

      expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
        ACTION_POLICY_SAVED_OBJECT_TYPE,
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
        client.snoozeActionPolicy({
          id: 'policy-id-snooze',
          snoozedUntil: 'not-a-date',
        })
      ).rejects.toMatchObject({
        output: { statusCode: 400 },
      });

      expect(mockSavedObjectsClient.update).not.toHaveBeenCalled();
    });

    it('throws 404 when update rejects with NotFoundError', async () => {
      mockSavedObjectsClient.update.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          ACTION_POLICY_SAVED_OBJECT_TYPE,
          'policy-id-snooze-404'
        )
      );

      await expect(
        client.snoozeActionPolicy({
          id: 'policy-id-snooze-404',
          snoozedUntil: '2025-06-01T12:00:00.000Z',
        })
      ).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
    });
  });

  describe('unsnoozeActionPolicy', () => {
    it('throws 404 when update rejects with NotFoundError', async () => {
      mockSavedObjectsClient.update.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          ACTION_POLICY_SAVED_OBJECT_TYPE,
          'policy-id-unsnooze-404'
        )
      );

      await expect(
        client.unsnoozeActionPolicy({ id: 'policy-id-unsnooze-404' })
      ).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
    });
  });

  describe('bulkEnableActionPolicies', () => {
    it('issues a single bulkUpdate stamping enabled:true + audit metadata', async () => {
      mockSavedObjectsClient.bulkUpdate.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'policy-1',
            type: ACTION_POLICY_SAVED_OBJECT_TYPE,
            attributes: {},
            references: [],
            version: 'WzMsMV0=',
          },
          {
            id: 'policy-2',
            type: ACTION_POLICY_SAVED_OBJECT_TYPE,
            attributes: {},
            references: [],
            version: 'WzQsMV0=',
          },
        ],
      });

      const res = await client.bulkEnableActionPolicies({ ids: ['policy-1', 'policy-2'] });

      expect(mockSavedObjectsClient.bulkUpdate).toHaveBeenCalledTimes(1);
      expect(mockSavedObjectsClient.bulkUpdate).toHaveBeenCalledWith([
        {
          type: ACTION_POLICY_SAVED_OBJECT_TYPE,
          id: 'policy-1',
          attributes: {
            enabled: true,
            updatedBy: 'elastic_profile_uid',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
        },
        {
          type: ACTION_POLICY_SAVED_OBJECT_TYPE,
          id: 'policy-2',
          attributes: {
            enabled: true,
            updatedBy: 'elastic_profile_uid',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
        },
      ]);
      expect(res).toEqual({ affected_count: 2, errors: [] });
    });

    it('returns an empty result without touching the store for an empty id list', async () => {
      const res = await client.bulkEnableActionPolicies({ ids: [] });

      expect(mockSavedObjectsClient.bulkUpdate).not.toHaveBeenCalled();
      expect(res).toEqual({ affected_count: 0, errors: [] });
    });

    it('maps per-object SO failures to the canonical bulk-error shape', async () => {
      mockSavedObjectsClient.bulkUpdate.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'ok-policy',
            type: ACTION_POLICY_SAVED_OBJECT_TYPE,
            attributes: {},
            references: [],
            version: 'WzMsMV0=',
          },
          {
            id: 'missing-policy',
            type: ACTION_POLICY_SAVED_OBJECT_TYPE,
            attributes: {} as ActionPolicySavedObjectAttributes,
            references: [],
            error: {
              statusCode: 404,
              error: 'Not Found',
              message: 'Saved object [action_policy/missing-policy] not found',
            },
          },
        ],
      });

      const res = await client.bulkEnableActionPolicies({
        ids: ['ok-policy', 'missing-policy'],
      });

      expect(res.affected_count).toBe(1);
      expect(res.errors).toEqual([
        {
          id: 'missing-policy',
          error: {
            code: 'ACTION_POLICY_NOT_FOUND',
            message: 'Saved object [action_policy/missing-policy] not found',
          },
        },
      ]);
    });
  });

  describe('bulkDisableActionPolicies', () => {
    it('issues a single bulkUpdate stamping enabled:false + audit metadata', async () => {
      mockSavedObjectsClient.bulkUpdate.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'policy-1',
            type: ACTION_POLICY_SAVED_OBJECT_TYPE,
            attributes: {},
            references: [],
            version: 'WzMsMV0=',
          },
        ],
      });

      const res = await client.bulkDisableActionPolicies({ ids: ['policy-1'] });

      expect(mockSavedObjectsClient.bulkUpdate).toHaveBeenCalledWith([
        {
          type: ACTION_POLICY_SAVED_OBJECT_TYPE,
          id: 'policy-1',
          attributes: {
            enabled: false,
            updatedBy: 'elastic_profile_uid',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
        },
      ]);
      expect(res).toEqual({ affected_count: 1, errors: [] });
    });
  });

  describe('bulkSnoozeActionPolicies', () => {
    it('issues a single bulkUpdate stamping snoozedUntil + audit metadata', async () => {
      mockSavedObjectsClient.bulkUpdate.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'policy-1',
            type: ACTION_POLICY_SAVED_OBJECT_TYPE,
            attributes: {},
            references: [],
            version: 'WzMsMV0=',
          },
        ],
      });

      const res = await client.bulkSnoozeActionPolicies({
        ids: ['policy-1'],
        snoozedUntil: '2025-06-01T12:00:00.000Z',
      });

      expect(mockSavedObjectsClient.bulkUpdate).toHaveBeenCalledWith([
        {
          type: ACTION_POLICY_SAVED_OBJECT_TYPE,
          id: 'policy-1',
          attributes: {
            snoozedUntil: '2025-06-01T12:00:00.000Z',
            updatedBy: 'elastic_profile_uid',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
        },
      ]);
      expect(res).toEqual({ affected_count: 1, errors: [] });
    });

    it('rejects an invalid snoozedUntil before touching the store', async () => {
      await expect(
        client.bulkSnoozeActionPolicies({ ids: ['policy-1'], snoozedUntil: 'not-a-date' })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });

      expect(mockSavedObjectsClient.bulkUpdate).not.toHaveBeenCalled();
    });
  });

  describe('bulkUnsnoozeActionPolicies', () => {
    it('issues a single bulkUpdate stamping snoozedUntil:null + audit metadata', async () => {
      mockSavedObjectsClient.bulkUpdate.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'policy-1',
            type: ACTION_POLICY_SAVED_OBJECT_TYPE,
            attributes: {},
            references: [],
            version: 'WzMsMV0=',
          },
        ],
      });

      const res = await client.bulkUnsnoozeActionPolicies({ ids: ['policy-1'] });

      expect(mockSavedObjectsClient.bulkUpdate).toHaveBeenCalledWith([
        {
          type: ACTION_POLICY_SAVED_OBJECT_TYPE,
          id: 'policy-1',
          attributes: {
            snoozedUntil: null,
            updatedBy: 'elastic_profile_uid',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
        },
      ]);
      expect(res).toEqual({ affected_count: 1, errors: [] });
    });
  });

  describe('bulkDeleteActionPolicies', () => {
    it('returns an empty result without touching the store for an empty id list', async () => {
      const res = await client.bulkDeleteActionPolicies({ ids: [] });

      expect(mockSavedObjectsClient.bulkDelete).not.toHaveBeenCalled();
      expect(res).toEqual({ affected_count: 0, errors: [] });
    });

    it('issues a single bulkDelete and reports affected_count', async () => {
      mockSavedObjectsClient.bulkDelete.mockResolvedValueOnce({
        statuses: [
          { id: 'policy-1', type: ACTION_POLICY_SAVED_OBJECT_TYPE, success: true },
          { id: 'policy-2', type: ACTION_POLICY_SAVED_OBJECT_TYPE, success: true },
        ],
      });

      const res = await client.bulkDeleteActionPolicies({ ids: ['policy-1', 'policy-2'] });

      expect(mockSavedObjectsClient.bulkDelete).toHaveBeenCalledTimes(1);
      expect(mockSavedObjectsClient.bulkDelete).toHaveBeenCalledWith([
        { type: ACTION_POLICY_SAVED_OBJECT_TYPE, id: 'policy-1' },
        { type: ACTION_POLICY_SAVED_OBJECT_TYPE, id: 'policy-2' },
      ]);
      expect(res).toEqual({ affected_count: 2, errors: [] });
    });

    it('maps per-object SO failures to the canonical bulk-error shape', async () => {
      mockSavedObjectsClient.bulkDelete.mockResolvedValueOnce({
        statuses: [
          {
            id: 'policy-2',
            type: ACTION_POLICY_SAVED_OBJECT_TYPE,
            success: false,
            error: { statusCode: 404, error: 'Not Found', message: 'Not found' },
          },
        ],
      });

      const res = await client.bulkDeleteActionPolicies({ ids: ['policy-2'] });

      expect(res.affected_count).toBe(0);
      expect(res.errors).toEqual([
        { id: 'policy-2', error: { code: 'ACTION_POLICY_NOT_FOUND', message: 'Not found' } },
      ]);
    });

    /**
     * Wires the PIT finder to return a decrypted auth block per id so the
     * bulk-delete path has keys to queue for invalidation.
     */
    const mockDecryptedAuthFor = (
      policies: Array<{ id: string; apiKey: string; createdByUser?: boolean }>
    ) => {
      const esoClient = mockEncryptedSavedObjects.getClient();
      (esoClient.createPointInTimeFinderDecryptedAsInternalUser as jest.Mock).mockResolvedValueOnce(
        {
          async *find() {
            yield {
              saved_objects: policies.map(({ id, apiKey, createdByUser = false }) => ({
                id,
                type: ACTION_POLICY_SAVED_OBJECT_TYPE,
                attributes: {
                  apiKey,
                  apiKeyCreatedByUser: createdByUser,
                  apiKeyOwner: 'test-user',
                },
                references: [],
              })),
            };
          },
          close: jest.fn(),
        }
      );
    };

    it('invalidates API keys for bulk-deleted policies in a single batched call', async () => {
      mockDecryptedAuthFor([
        { id: 'policy-del-1', apiKey: 'key-1' },
        { id: 'policy-del-2', apiKey: 'key-2' },
      ]);
      mockSavedObjectsClient.bulkDelete.mockResolvedValueOnce({
        statuses: [
          { id: 'policy-del-1', type: ACTION_POLICY_SAVED_OBJECT_TYPE, success: true },
          { id: 'policy-del-2', type: ACTION_POLICY_SAVED_OBJECT_TYPE, success: true },
        ],
      });

      const res = await client.bulkDeleteActionPolicies({
        ids: ['policy-del-1', 'policy-del-2'],
      });

      expect(res).toEqual({ affected_count: 2, errors: [] });
      expect(apiKeyService.markApiKeysForInvalidation).toHaveBeenCalledTimes(1);
      expect(apiKeyService.markApiKeysForInvalidation).toHaveBeenCalledWith(['key-1', 'key-2']);
    });

    it('queues API keys for invalidation before deleting the saved objects', async () => {
      mockDecryptedAuthFor([{ id: 'policy-del-order', apiKey: 'key-order' }]);
      mockSavedObjectsClient.bulkDelete.mockResolvedValueOnce({
        statuses: [
          { id: 'policy-del-order', type: ACTION_POLICY_SAVED_OBJECT_TYPE, success: true },
        ],
      });

      await client.bulkDeleteActionPolicies({ ids: ['policy-del-order'] });

      const invalidationOrder =
        apiKeyService.markApiKeysForInvalidation.mock.invocationCallOrder[0];
      const deleteOrder = mockSavedObjectsClient.bulkDelete.mock.invocationCallOrder[0];
      expect(invalidationOrder).toBeLessThan(deleteOrder);
    });

    it('leaves a policy in place when its API key cannot be queued for invalidation', async () => {
      mockDecryptedAuthFor([
        { id: 'policy-del-ok', apiKey: 'key-ok' },
        { id: 'policy-del-stuck', apiKey: 'key-stuck' },
      ]);
      apiKeyService.markApiKeysForInvalidation.mockResolvedValueOnce([
        { success: true },
        { success: false, message: 'index is read-only' },
      ]);
      mockSavedObjectsClient.bulkDelete.mockResolvedValueOnce({
        statuses: [{ id: 'policy-del-ok', type: ACTION_POLICY_SAVED_OBJECT_TYPE, success: true }],
      });

      const res = await client.bulkDeleteActionPolicies({
        ids: ['policy-del-ok', 'policy-del-stuck'],
      });

      // The blocked policy never reaches the delete phase, so its still-valid
      // API key keeps a saved object referencing it.
      expect(mockSavedObjectsClient.bulkDelete).toHaveBeenCalledWith([
        { type: ACTION_POLICY_SAVED_OBJECT_TYPE, id: 'policy-del-ok' },
      ]);
      expect(res.affected_count).toBe(1);
      expect(res.errors).toEqual([
        {
          id: 'policy-del-stuck',
          error: {
            code: 'API_KEY_INVALIDATION_FAILED',
            message:
              'Action policy with id "policy-del-stuck" was not deleted because its API key could not be queued for invalidation: index is read-only',
          },
        },
      ]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Skipped deleting action policy(ies) [policy-del-stuck]'),
        expect.objectContaining({
          error: expect.objectContaining({
            code: ALERTING_V2_LOG_CODES.ACTION_POLICY_DELETE_BLOCKED_BY_API_KEY_INVALIDATION,
          }),
        })
      );
    });

    it('skips the delete round-trip entirely when every invalidation fails', async () => {
      mockDecryptedAuthFor([{ id: 'policy-del-stuck', apiKey: 'key-stuck' }]);
      apiKeyService.markApiKeysForInvalidation.mockResolvedValueOnce([
        { success: false, message: 'index is read-only' },
      ]);

      const res = await client.bulkDeleteActionPolicies({ ids: ['policy-del-stuck'] });

      expect(mockSavedObjectsClient.bulkDelete).not.toHaveBeenCalled();
      expect(res.affected_count).toBe(0);
      expect(res.errors).toHaveLength(1);
    });

    it('logs divergence when keys were queued but the delete failed', async () => {
      mockDecryptedAuthFor([{ id: 'policy-del-diverged', apiKey: 'key-diverged' }]);
      mockSavedObjectsClient.bulkDelete.mockResolvedValueOnce({
        statuses: [
          {
            id: 'policy-del-diverged',
            type: ACTION_POLICY_SAVED_OBJECT_TYPE,
            success: false,
            error: { statusCode: 409, error: 'Conflict', message: 'version conflict' },
          },
        ],
      });

      const res = await client.bulkDeleteActionPolicies({ ids: ['policy-del-diverged'] });

      expect(res.affected_count).toBe(0);
      expect(res.errors).toEqual([
        {
          id: 'policy-del-diverged',
          error: { code: 'ACTION_POLICY_VERSION_CONFLICT', message: 'version conflict' },
        },
      ]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          'Queued API key(s) for action policy(ies) [policy-del-diverged] for invalidation but failed to delete them'
        ),
        expect.objectContaining({
          error: expect.objectContaining({
            code: ALERTING_V2_LOG_CODES.ACTION_POLICY_API_KEY_INVALIDATION_DIVERGED,
          }),
        })
      );
    });

    it('does not log divergence when the delete succeeds', async () => {
      mockDecryptedAuthFor([{ id: 'policy-del-clean', apiKey: 'key-clean' }]);
      mockSavedObjectsClient.bulkDelete.mockResolvedValueOnce({
        statuses: [
          { id: 'policy-del-clean', type: ACTION_POLICY_SAVED_OBJECT_TYPE, success: true },
        ],
      });

      await client.bulkDeleteActionPolicies({ ids: ['policy-del-clean'] });

      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('skips API key invalidation for bulk-deleted policies with createdByUser: true', async () => {
      mockDecryptedAuthFor([{ id: 'policy-del-user', apiKey: 'user-key', createdByUser: true }]);
      mockSavedObjectsClient.bulkDelete.mockResolvedValueOnce({
        statuses: [{ id: 'policy-del-user', type: ACTION_POLICY_SAVED_OBJECT_TYPE, success: true }],
      });

      const res = await client.bulkDeleteActionPolicies({ ids: ['policy-del-user'] });

      expect(res).toEqual({ affected_count: 1, errors: [] });
      expect(apiKeyService.markApiKeysForInvalidation).not.toHaveBeenCalled();
    });

    it('does not throw when PIT finder fails during bulk delete', async () => {
      const esoClient = mockEncryptedSavedObjects.getClient();
      (esoClient.createPointInTimeFinderDecryptedAsInternalUser as jest.Mock).mockRejectedValueOnce(
        new Error('decryption failure')
      );
      mockSavedObjectsClient.bulkDelete.mockResolvedValueOnce({
        statuses: [{ id: 'policy-del-err', type: ACTION_POLICY_SAVED_OBJECT_TYPE, success: true }],
      });

      const res = await client.bulkDeleteActionPolicies({ ids: ['policy-del-err'] });

      expect(res).toEqual({ affected_count: 1, errors: [] });
      expect(apiKeyService.markApiKeysForInvalidation).not.toHaveBeenCalled();
    });
  });

  describe('bulkUpdateActionPoliciesApiKey', () => {
    const existingAttributes: ActionPolicySavedObjectAttributes = {
      name: 'existing-policy',
      description: 'existing-policy description',
      enabled: true,
      destinations: [{ type: 'workflow', id: 'existing-workflow' }],
      apiKey: 'old-api-key',
      apiKeyOwner: 'old-user',
      apiKeyCreatedByUser: false,
      createdBy: 'creator_profile_uid',
      createdAt: '2024-12-01T00:00:00.000Z',
      updatedBy: 'updater_profile_uid',
      updatedAt: '2024-12-01T00:00:00.000Z',
    };

    it('rotates the API key for every id and reports affected_count', async () => {
      mockSavedObjectsClient.get.mockResolvedValue({
        id: 'policy-1',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
        version: 'WzEsMV0=',
        attributes: existingAttributes,
      });

      const res = await client.bulkUpdateActionPoliciesApiKey({ ids: ['policy-1', 'policy-2'] });

      expect(mockSavedObjectsClient.update).toHaveBeenCalledTimes(2);
      expect(res).toEqual({ affected_count: 2, errors: [] });
    });

    it('collects a per-item error when a single rotation fails and keeps going', async () => {
      mockSavedObjectsClient.get
        .mockResolvedValueOnce({
          id: 'policy-ok',
          type: ACTION_POLICY_SAVED_OBJECT_TYPE,
          references: [],
          version: 'WzEsMV0=',
          attributes: existingAttributes,
        })
        .mockRejectedValueOnce(
          SavedObjectsErrorHelpers.createGenericNotFoundError(
            ACTION_POLICY_SAVED_OBJECT_TYPE,
            'policy-missing'
          )
        );

      const res = await client.bulkUpdateActionPoliciesApiKey({
        ids: ['policy-ok', 'policy-missing'],
      });

      expect(res.affected_count).toBe(1);
      expect(res.errors).toHaveLength(1);
      expect(res.errors[0].id).toBe('policy-missing');
      expect(res.errors[0].error.code).toBe('ACTION_POLICY_NOT_FOUND');
    });

    it('rotates keys concurrently instead of one-at-a-time', async () => {
      mockSavedObjectsClient.get.mockResolvedValue({
        id: 'policy',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
        version: 'WzEsMV0=',
        attributes: existingAttributes,
      });

      const ids = ['policy-1', 'policy-2', 'policy-3'];
      let inFlight = 0;

      // Every rotation parks on this shared gate until the test releases it, so
      // they all stay in flight at once. `allInFlight` resolves only when the
      // last rotation reaches the gate — which can only happen if they run
      // concurrently. A sequential loop keeps `inFlight` at 1, never resolves
      // `allInFlight`, and times the test out.
      let releaseAll: () => void = () => {};
      const gate = new Promise<void>((resolve) => {
        releaseAll = resolve;
      });

      let markAllInFlight: () => void = () => {};
      const allInFlight = new Promise<void>((resolve) => {
        markAllInFlight = resolve;
      });

      apiKeyService.create.mockImplementation(async () => {
        inFlight += 1;
        if (inFlight === ids.length) {
          markAllInFlight();
        }
        await gate;
        return { apiKey: 'encoded-es-api-key', owner: 'test-user', createdByUser: false };
      });

      const resultPromise = client.bulkUpdateActionPoliciesApiKey({ ids });

      await allInFlight;

      // All rotations reached key creation before any of them completed.
      expect(apiKeyService.create).toHaveBeenCalledTimes(ids.length);

      releaseAll();

      expect(await resultPromise).toEqual({ affected_count: 3, errors: [] });
    });
  });

  describe('getAllTags', () => {
    const makeFindAggResponse = (buckets: Array<{ key: string }>) => ({
      saved_objects: [],
      total: 0,
      per_page: 0,
      page: 1,
      aggregations: {
        tags: { buckets },
      },
    });

    it('returns tags from aggregation buckets', async () => {
      mockSavedObjectsClient.find.mockResolvedValueOnce(
        makeFindAggResponse([{ key: 'critical' }, { key: 'production' }, { key: 'staging' }])
      );

      const result = await client.getAllTags();

      expect(result).toEqual(['critical', 'production', 'staging']);
      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ACTION_POLICY_SAVED_OBJECT_TYPE,
          perPage: 0,
          aggs: expect.objectContaining({
            tags: expect.objectContaining({
              terms: expect.objectContaining({
                field: `${ACTION_POLICY_SAVED_OBJECT_TYPE}.attributes.tags`,
              }),
            }),
          }),
        })
      );
    });

    it('passes search parameter as include prefix pattern', async () => {
      mockSavedObjectsClient.find.mockResolvedValueOnce(
        makeFindAggResponse([{ key: 'production' }])
      );

      const result = await client.getAllTags({ search: 'prod' });

      expect(result).toEqual(['production']);
      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          aggs: expect.objectContaining({
            tags: expect.objectContaining({
              terms: expect.objectContaining({
                include: 'prod.*',
              }),
            }),
          }),
        })
      );
    });

    it('returns empty array when no tags exist', async () => {
      mockSavedObjectsClient.find.mockResolvedValueOnce(makeFindAggResponse([]));

      const result = await client.getAllTags();

      expect(result).toEqual([]);
    });
  });

  describe('deleteActionPolicy', () => {
    it('deletes a action policy successfully', async () => {
      const existingAttributes: ActionPolicySavedObjectAttributes = {
        name: 'policy-to-delete',
        description: 'policy-to-delete description',
        enabled: true,
        destinations: [{ type: 'workflow', id: 'workflow-to-delete' }],
        apiKey: 'some-key',
        apiKeyOwner: 'test-user',
        apiKeyCreatedByUser: false,
        createdBy: 'elastic_profile_uid',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'elastic_profile_uid',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-del-1',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
        version: 'WzEsMV0=',
        attributes: existingAttributes,
      });

      await client.deleteActionPolicy({ id: 'policy-id-del-1' });

      expect(mockSavedObjectsClient.delete).toHaveBeenCalledWith(
        ACTION_POLICY_SAVED_OBJECT_TYPE,
        'policy-id-del-1'
      );
      expect(apiKeyService.markApiKeysForInvalidation).toHaveBeenCalledWith(['some-key']);
      expect(apiKeyService.markApiKeysForInvalidation.mock.invocationCallOrder[0]).toBeLessThan(
        mockSavedObjectsClient.delete.mock.invocationCallOrder[0]
      );
    });

    it('does not delete the policy when its API key cannot be queued for invalidation', async () => {
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-del-1',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
        version: 'WzEsMV0=',
        attributes: {
          name: 'policy-to-delete',
          description: '',
          destinations: [],
          apiKey: 'some-key',
          apiKeyOwner: 'test-user',
          apiKeyCreatedByUser: false,
          createdBy: 'elastic_profile_uid',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedBy: 'elastic_profile_uid',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
      });
      apiKeyService.markApiKeysForInvalidation.mockResolvedValueOnce([
        { success: false, message: 'index is read-only' },
      ]);

      await expect(client.deleteActionPolicy({ id: 'policy-id-del-1' })).rejects.toMatchObject({
        output: { statusCode: 500 },
        data: {
          code: 'API_KEY_INVALIDATION_FAILED',
          details: { action_policy_id: 'policy-id-del-1' },
        },
      });

      expect(mockSavedObjectsClient.delete).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Skipped deleting action policy(ies) [policy-id-del-1]'),
        expect.objectContaining({
          error: expect.objectContaining({
            code: ALERTING_V2_LOG_CODES.ACTION_POLICY_DELETE_BLOCKED_BY_API_KEY_INVALIDATION,
          }),
        })
      );
    });

    it('logs divergence when the key was queued but the delete failed', async () => {
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-del-1',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
        version: 'WzEsMV0=',
        attributes: {
          name: 'policy-to-delete',
          description: '',
          destinations: [],
          apiKey: 'some-key',
          apiKeyOwner: 'test-user',
          apiKeyCreatedByUser: false,
          createdBy: 'elastic_profile_uid',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedBy: 'elastic_profile_uid',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
      });
      mockSavedObjectsClient.delete.mockRejectedValueOnce(new Error('delete failed'));

      await expect(client.deleteActionPolicy({ id: 'policy-id-del-1' })).rejects.toThrow(
        'delete failed'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          'Queued API key(s) for action policy(ies) [policy-id-del-1] for invalidation but failed to delete them'
        ),
        expect.objectContaining({
          error: expect.objectContaining({
            code: ALERTING_V2_LOG_CODES.ACTION_POLICY_API_KEY_INVALIDATION_DIVERGED,
          }),
        })
      );
    });

    it('throws 404 when action policy is not found', async () => {
      mockSavedObjectsClient.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          ACTION_POLICY_SAVED_OBJECT_TYPE,
          'policy-id-del-404'
        )
      );

      await expect(client.deleteActionPolicy({ id: 'policy-id-del-404' })).rejects.toMatchObject({
        output: { statusCode: 404 },
      });

      expect(mockSavedObjectsClient.delete).not.toHaveBeenCalled();
    });

    it('does not mark API key for invalidation when policy auth was createdByUser', async () => {
      const esoClient = mockEncryptedSavedObjects.getClient();
      (esoClient.getDecryptedAsInternalUser as jest.Mock).mockResolvedValueOnce({
        id: 'policy-id-del-user',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        attributes: {
          apiKey: 'user-created-key',
          apiKeyCreatedByUser: true,
          apiKeyOwner: 'test-user',
        },
        references: [],
      });
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-del-user',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
        version: 'WzEsMV0=',
        attributes: {
          name: 'user-policy',
          description: '',
          destinations: [],
          apiKey: 'user-created-key',
          apiKeyOwner: 'test-user',
          apiKeyCreatedByUser: true,
          createdBy: 'elastic_profile_uid',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedBy: 'elastic_profile_uid',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
      });

      await client.deleteActionPolicy({ id: 'policy-id-del-user' });

      expect(mockSavedObjectsClient.delete).toHaveBeenCalledWith(
        ACTION_POLICY_SAVED_OBJECT_TYPE,
        'policy-id-del-user'
      );
      expect(apiKeyService.markApiKeysForInvalidation).not.toHaveBeenCalled();
    });

    it('does not call invalidation when decrypted policy has no apiKey', async () => {
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-del-no-key',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
        version: 'WzEsMV0=',
        attributes: {
          name: 'policy-no-key',
          description: '',
          destinations: [],
          apiKeyOwner: 'test-user',
          apiKeyCreatedByUser: false,
          createdBy: 'elastic_profile_uid',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedBy: 'elastic_profile_uid',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
      });
      const esoClient = mockEncryptedSavedObjects.getClient();
      (esoClient.getDecryptedAsInternalUser as jest.Mock).mockResolvedValueOnce({
        id: 'policy-id-del-no-key',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        attributes: {
          apiKeyCreatedByUser: false,
          apiKeyOwner: 'test-user',
        },
        references: [],
      });

      await client.deleteActionPolicy({ id: 'policy-id-del-no-key' });

      expect(mockSavedObjectsClient.delete).toHaveBeenCalledWith(
        ACTION_POLICY_SAVED_OBJECT_TYPE,
        'policy-id-del-no-key'
      );
      expect(apiKeyService.markApiKeysForInvalidation).not.toHaveBeenCalled();
    });
  });

  describe('error codes and details', () => {
    it('attaches ACTION_POLICY_NOT_FOUND code and action_policy_id details on getActionPolicy', async () => {
      mockSavedObjectsClient.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          ACTION_POLICY_SAVED_OBJECT_TYPE,
          'missing-policy'
        )
      );

      await expect(client.getActionPolicy({ id: 'missing-policy' })).rejects.toMatchObject({
        output: { statusCode: 404 },
        data: {
          code: 'ACTION_POLICY_NOT_FOUND',
          details: { action_policy_id: 'missing-policy' },
        },
      });
    });

    it('attaches ACTION_POLICY_ALREADY_EXISTS code on create conflict', async () => {
      mockSavedObjectsClient.create.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createConflictError(ACTION_POLICY_SAVED_OBJECT_TYPE, 'policy-dup')
      );

      await expect(
        client.createActionPolicy({
          data: {
            name: 'my-policy',
            description: 'my-policy description',
            destinations: [{ type: 'workflow', id: 'my-workflow' }],
          },
          options: { id: 'policy-dup' },
        })
      ).rejects.toMatchObject({
        output: { statusCode: 409 },
        data: {
          code: 'ACTION_POLICY_ALREADY_EXISTS',
          details: { action_policy_id: 'policy-dup' },
        },
      });
    });

    it('attaches INVALID_ACTION_POLICY_DATA code with Zod issues when data is invalid', async () => {
      await expect(
        client.createActionPolicy({
          data: {
            name: 'my-policy',
            description: 'my-policy description',
            destinations: [],
          },
        })
      ).rejects.toMatchObject({
        output: { statusCode: 400 },
        data: {
          code: 'INVALID_ACTION_POLICY_DATA',
          details: {
            context: 'create',
            errors: {
              errors: [],
              properties: {
                destinations: {
                  errors: ['At least one destination must be provided'],
                },
              },
            },
          },
        },
      });
    });

    it('attaches ACTION_POLICY_VERSION_CONFLICT code on update version conflict', async () => {
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-version-conflict',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
        version: 'WzEsMV0=',
        attributes: {
          name: 'original',
          description: 'original description',
          enabled: true,
          destinations: [{ type: 'workflow', id: 'w' }],
          apiKey: 'old-api-key',
          apiKeyOwner: 'old-user',
          apiKeyCreatedByUser: false,
          createdBy: 'creator_profile_uid',
          createdByUsername: 'creator',
          createdAt: '2024-12-01T00:00:00.000Z',
          updatedBy: 'updater_profile_uid',
          updatedByUsername: 'updater',
          updatedAt: '2024-12-01T00:00:00.000Z',
        },
      });
      mockSavedObjectsClient.update.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createConflictError(
          ACTION_POLICY_SAVED_OBJECT_TYPE,
          'policy-version-conflict'
        )
      );

      await expect(
        client.updateActionPolicy({
          data: { destinations: [{ type: 'workflow', id: 'new-workflow' }] },
          options: { id: 'policy-version-conflict', version: 'WzEsMV0=' },
        })
      ).rejects.toMatchObject({
        output: { statusCode: 409 },
        data: {
          code: 'ACTION_POLICY_VERSION_CONFLICT',
          details: { action_policy_id: 'policy-version-conflict' },
        },
      });
    });

    it('attaches INVALID_DATE_STRING code when snoozedUntil is not a valid ISO datetime', async () => {
      await expect(
        client.snoozeActionPolicy({
          id: 'policy-id-snooze-bad-date',
          snoozedUntil: 'not-a-date',
        })
      ).rejects.toMatchObject({
        output: { statusCode: 400 },
        data: {
          code: 'INVALID_DATE_STRING',
          details: { value: 'not-a-date' },
        },
      });

      expect(mockSavedObjectsClient.update).not.toHaveBeenCalled();
    });
  });

  describe('matchActionPoliciesForRule', () => {
    const makeFindResponse = (
      items: Array<{
        id: string;
        attributes: ActionPolicySavedObjectAttributes;
        version?: string;
      }>,
      total?: number
    ) => ({
      saved_objects: items.map((item) => ({
        id: item.id,
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
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

    const baseAttributes: ActionPolicySavedObjectAttributes = {
      name: 'my-policy',
      description: 'desc',
      enabled: true,
      destinations: [{ type: 'workflow', id: 'wf-1' }],
      matcher: null,
      apiKey: 'key',
      apiKeyOwner: 'user',
      apiKeyCreatedByUser: false,
      createdBy: 'user',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedBy: 'user',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };

    const ruleAttributes = {
      metadata: {
        name: 'my-rule',
        tags: ['prod'],
      },
    };

    beforeEach(() => {
      (evaluateKql as jest.Mock).mockReset();
    });

    it('returns empty list when ruleId is provided and rule is not found', async () => {
      jest
        .spyOn(rulesSavedObjectService, 'get')
        .mockRejectedValueOnce(
          SavedObjectsErrorHelpers.createGenericNotFoundError('rule', 'missing-rule')
        );

      const result = await client.matchActionPoliciesForRule({ ruleId: 'missing-rule' });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('returns global APs for policies with no matcher, along with the space-scoped total', async () => {
      jest.spyOn(rulesSavedObjectService, 'get').mockResolvedValueOnce({
        id: 'rule-1',
        attributes: ruleAttributes as never,
        version: 'v1',
      });

      mockSavedObjectsClient.find.mockResolvedValueOnce(
        makeFindResponse(
          [{ id: 'ap-catchall', attributes: { ...baseAttributes, matcher: null } }],
          150
        )
      );

      const result = await client.matchActionPoliciesForRule({ ruleId: 'rule-1' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].category).toBe('global');
      expect(result.items[0].actionPolicy.id).toBe('ap-catchall');
      expect(result.total).toBe(150);
    });

    it('returns global-filtered APs for policies where evaluateKql returns true', async () => {
      jest.spyOn(rulesSavedObjectService, 'get').mockResolvedValueOnce({
        id: 'rule-1',
        attributes: ruleAttributes as never,
        version: 'v1',
      });

      const matcherAttr: ActionPolicySavedObjectAttributes = {
        ...baseAttributes,
        matcher: 'rule.id : "rule-1"',
      };

      mockSavedObjectsClient.find.mockResolvedValueOnce(
        makeFindResponse([{ id: 'ap-matcher', attributes: matcherAttr }])
      );

      (evaluateKql as jest.Mock).mockReturnValue(true);

      const result = await client.matchActionPoliciesForRule({ ruleId: 'rule-1' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].category).toBe('global-filtered');
      expect(result.items[0].actionPolicy.id).toBe('ap-matcher');
    });

    it('skips APs where evaluateKql returns false', async () => {
      jest.spyOn(rulesSavedObjectService, 'get').mockResolvedValueOnce({
        id: 'rule-1',
        attributes: ruleAttributes as never,
        version: 'v1',
      });

      const matcherAttr: ActionPolicySavedObjectAttributes = {
        ...baseAttributes,
        matcher: 'rule.tags : "staging"',
      };

      mockSavedObjectsClient.find.mockResolvedValueOnce(
        makeFindResponse([{ id: 'ap-no-match', attributes: matcherAttr }])
      );

      (evaluateKql as jest.Mock).mockReturnValue(false);

      const result = await client.matchActionPoliciesForRule({ ruleId: 'rule-1' });

      expect(result.items).toHaveLength(0);
    });

    it('skips APs where evaluateKql throws and does not re-throw', async () => {
      jest.spyOn(rulesSavedObjectService, 'get').mockResolvedValueOnce({
        id: 'rule-1',
        attributes: ruleAttributes as never,
        version: 'v1',
      });

      const matcherAttr: ActionPolicySavedObjectAttributes = {
        ...baseAttributes,
        matcher: 'invalid kql !!!',
      };

      mockSavedObjectsClient.find.mockResolvedValueOnce(
        makeFindResponse([{ id: 'ap-err', attributes: matcherAttr }])
      );

      (evaluateKql as jest.Mock).mockImplementation(() => {
        throw new Error('KQL parse error');
      });

      const result = await client.matchActionPoliciesForRule({ ruleId: 'rule-1' });

      expect(result.items).toHaveLength(0);
    });

    it('uses provided ruleName and ruleTags to evaluate matchers without fetching from DB', async () => {
      const matcherAttr: ActionPolicySavedObjectAttributes = {
        ...baseAttributes,
        matcher: 'rule.tags : "prod"',
      };

      mockSavedObjectsClient.find.mockResolvedValueOnce(
        makeFindResponse([{ id: 'ap-matcher', attributes: matcherAttr }])
      );

      (evaluateKql as jest.Mock).mockReturnValue(true);

      const result = await client.matchActionPoliciesForRule({
        ruleName: 'my-rule',
        ruleTags: ['prod'],
      });

      expect(rulesSavedObjectService.get).not.toHaveBeenCalled();
      expect(result.items).toHaveLength(1);
      expect(result.items[0].category).toBe('global-filtered');
    });
  });
});
