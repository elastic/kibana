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
import { createUserProfile, createUserService } from '../services/user_service/user_service.mock';
import { ActionPolicyClient } from './action_policy_client';

describe('ActionPolicyClient', () => {
  let client: ActionPolicyClient;
  let actionPolicySavedObjectService: ActionPolicySavedObjectService;
  let mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let rulesSavedObjectService: RulesSavedObjectService;
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
      'default'
    );

    userProfileService.getCurrent.mockResolvedValue(createUserProfile('elastic_profile_uid'));

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
          type: 'global',
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
          type: 'global',
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
          type: 'global',
          enabled: true,
          destinations: [{ type: 'workflow', id: 'my-workflow' }],
          auth: {
            apiKey: 'encoded-es-api-key',
            owner: 'test-user',
            createdByUser: false,
          },
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

    describe('type and ruleId', () => {
      const baseData = {
        name: 'p',
        description: 'd',
        destinations: [{ type: 'workflow' as const, id: 'w' }],
      };

      const mockCreateResolved = (id: string) =>
        mockSavedObjectsClient.create.mockResolvedValueOnce({
          id,
          type: ACTION_POLICY_SAVED_OBJECT_TYPE,
          attributes: {} as ActionPolicySavedObjectAttributes,
          references: [],
          version: 'WzEsMV0=',
        });

      it('defaults to type "global" with null ruleId when type is omitted', async () => {
        mockCreateResolved('p-default');

        const res = await client.createActionPolicy({
          data: baseData,
          options: { id: 'p-default' },
        });

        expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
          ACTION_POLICY_SAVED_OBJECT_TYPE,
          expect.objectContaining({ type: 'global', ruleId: null }),
          expect.anything()
        );
        expect(res.type).toBe('global');
        expect(res.ruleId).toBeNull();
      });

      it('persists "single_rule" with the linked ruleId', async () => {
        mockCreateResolved('p-single');

        const res = await client.createActionPolicy({
          data: { ...baseData, type: 'single_rule', ruleId: 'rule-7' },
          options: { id: 'p-single' },
        });

        expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
          ACTION_POLICY_SAVED_OBJECT_TYPE,
          expect.objectContaining({ type: 'single_rule', ruleId: 'rule-7' }),
          expect.anything()
        );
        expect(res.type).toBe('single_rule');
        expect(res.ruleId).toBe('rule-7');
      });

      it('rejects "single_rule" without ruleId at the schema layer', async () => {
        await expect(
          client.createActionPolicy({
            data: { ...baseData, type: 'single_rule' as const },
          })
        ).rejects.toMatchObject({ output: { statusCode: 400 } });

        expect(mockSavedObjectsClient.create).not.toHaveBeenCalled();
      });

      it('rejects "single_rule" when the linked rule does not exist', async () => {
        jest
          .spyOn(rulesSavedObjectService, 'get')
          .mockRejectedValueOnce(
            SavedObjectsErrorHelpers.createGenericNotFoundError('rule', 'rule-missing')
          );

        await expect(
          client.createActionPolicy({
            data: { ...baseData, type: 'single_rule', ruleId: 'rule-missing' },
          })
        ).rejects.toMatchObject({ output: { statusCode: 400 } });

        expect(mockSavedObjectsClient.create).not.toHaveBeenCalled();
      });

      it('rejects "global" with ruleId at the schema layer', async () => {
        await expect(
          client.createActionPolicy({
            data: { ...baseData, type: 'global' as const, ruleId: 'rule-7' },
          })
        ).rejects.toMatchObject({ output: { statusCode: 400 } });

        expect(mockSavedObjectsClient.create).not.toHaveBeenCalled();
      });
    });
  });

  describe('getActionPolicy', () => {
    it('returns a action policy by id with auth.apiKey stripped', async () => {
      const existingAttributes: ActionPolicySavedObjectAttributes = {
        name: 'test-policy',
        description: 'test-policy description',
        type: 'global',
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
        type: 'global',
        enabled: true,
        destinations: [{ type: 'workflow', id: 'test-workflow' }],
        throttle: { strategy: 'on_status_change', interval: '5m' }, // stale pre-fix state
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
        id: 'policy-id-get-stale',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        attributes: existingAttributes,
        references: [],
        version: 'WzEsMV0=',
      });

      const res = await client.getActionPolicy({ id: 'policy-id-get-stale' });

      expect(res.throttle).toEqual({ strategy: 'on_status_change', interval: null });
    });

    it('returns ruleId for a single_rule policy', async () => {
      const existingAttributes = {
        name: 's',
        description: 'd',
        type: 'single_rule',
        ruleId: 'rule-7',
        enabled: true,
        destinations: [{ type: 'workflow' as const, id: 'w' }],
        auth: { apiKey: 'k', owner: 'u', createdByUser: false },
        createdBy: null,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: null,
        updatedAt: '2025-01-01T00:00:00.000Z',
      } as ActionPolicySavedObjectAttributes;

      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'p-single',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        attributes: existingAttributes,
        references: [],
        version: 'WzEsMV0=',
      });

      const res = await client.getActionPolicy({ id: 'p-single' });

      expect(res.type).toBe('single_rule');
      expect(res.ruleId).toBe('rule-7');
    });
  });

  describe('getActionPolicies', () => {
    it('returns action policies for multiple ids in input order', async () => {
      const firstAttributes: ActionPolicySavedObjectAttributes = {
        name: 'policy-two',
        description: 'policy-two description',
        type: 'global',
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
      const secondAttributes: ActionPolicySavedObjectAttributes = {
        name: 'policy-one',
        description: 'policy-one description',
        type: 'global',
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
        type: 'global',
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
      const thirdAttributes: ActionPolicySavedObjectAttributes = {
        name: 'policy-found-three',
        description: 'policy-found-three description',
        type: 'global',
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
        type: 'global',
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
      type: 'global',
      enabled: true,
      destinations: [{ type: 'workflow', id: 'find-workflow' }],
      auth: {
        apiKey: 'secret-find-key',
        owner: 'find-user',
        createdByUser: false,
      },
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

    it('forwards search parameter with search fields', async () => {
      mockSavedObjectsClient.find.mockResolvedValueOnce(makeFindResponse([]));

      await client.findActionPolicies({ search: 'my-search' });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'my-search',
          searchFields: ['name', 'description', 'destinations.id'],
        })
      );
    });

    it('builds KQL filter for destinationType', async () => {
      mockSavedObjectsClient.find.mockResolvedValueOnce(makeFindResponse([]));

      await client.findActionPolicies({ destinationType: 'workflow' });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({ type: 'function' }),
        })
      );
    });

    it('builds KQL filter for createdBy', async () => {
      mockSavedObjectsClient.find.mockResolvedValueOnce(makeFindResponse([]));

      await client.findActionPolicies({ createdBy: 'user-123' });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({ type: 'function' }),
        })
      );
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

    it('maps sort field createdAt without transformation', async () => {
      mockSavedObjectsClient.find.mockResolvedValueOnce(makeFindResponse([]));

      await client.findActionPolicies({ sortField: 'createdAt', sortOrder: 'desc' });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          sortField: 'createdAt',
          sortOrder: 'desc',
        })
      );
    });

    it('returns multiple items with correct structure', async () => {
      const secondAttributes: ActionPolicySavedObjectAttributes = {
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
        type: 'global',
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
        type: 'global',
        enabled: true,
        destinations: [{ type: 'workflow', id: 'wf-1' }],
        groupingMode: 'per_episode',
        throttle: { strategy: 'per_status_interval', interval: '10m' },
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
        type: 'global',
        enabled: true,
        destinations: [{ type: 'workflow', id: 'wf-1' }],
        groupingMode: 'per_episode',
        throttle: { strategy: 'on_status_change', interval: null },
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
        type: 'global',
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

    it('preserves existing tags when tags is not provided in update', async () => {
      const existingAttributes: ActionPolicySavedObjectAttributes = {
        name: 'tagged-policy',
        description: 'a policy with tags',
        type: 'global',
        enabled: true,
        destinations: [{ type: 'workflow', id: 'wf-1' }],
        tags: ['production', 'critical'],
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
        type: 'global',
        enabled: true,
        destinations: [{ type: 'workflow', id: 'wf-1' }],
        tags: ['production'],
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
        type: 'global',
        enabled: true,
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
          auth: { apiKey: 'old-api-key', createdByUser: true, owner: 'test-user' },
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
        type: 'global',
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
          auth: { apiKey: 'old-api-key', createdByUser: false, owner: 'test-user' },
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
        type: 'global',
        enabled: true,
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
          auth: { createdByUser: false, owner: 'test-user' },
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
        type: 'global',
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

    describe('type and ruleId immutability', () => {
      const baseExisting: ActionPolicySavedObjectAttributes = {
        name: 'existing',
        description: 'd',
        type: 'global',
        enabled: true,
        destinations: [{ type: 'workflow', id: 'w' }],
        auth: { apiKey: 'old-key', owner: 'u', createdByUser: false },
        createdBy: null,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: null,
        updatedAt: '2025-01-01T00:00:00.000Z',
      };

      const setupSinglePolicyMocks = (existing: ActionPolicySavedObjectAttributes) => {
        mockSavedObjectsClient.get.mockResolvedValueOnce({
          id: 'p-1',
          type: ACTION_POLICY_SAVED_OBJECT_TYPE,
          references: [],
          version: 'WzEsMV0=',
          attributes: existing,
        });
        mockSavedObjectsClient.update.mockResolvedValueOnce({
          id: 'p-1',
          type: ACTION_POLICY_SAVED_OBJECT_TYPE,
          attributes: {} as ActionPolicySavedObjectAttributes,
          references: [],
          version: 'WzIsMV0=',
        });
      };

      it('preserves type and ruleId from the existing single_rule policy on partial update', async () => {
        setupSinglePolicyMocks({
          ...baseExisting,
          type: 'single_rule',
          ruleId: 'rule-1',
        });

        await client.updateActionPolicy({
          data: { name: 'renamed' },
          options: { id: 'p-1', version: 'WzEsMV0=' },
        });

        expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
          ACTION_POLICY_SAVED_OBJECT_TYPE,
          'p-1',
          expect.objectContaining({ type: 'single_rule', ruleId: 'rule-1', name: 'renamed' }),
          { version: 'WzEsMV0=' }
        );
      });

      it('preserves type and ruleId from the existing global policy on partial update', async () => {
        setupSinglePolicyMocks({ ...baseExisting });

        await client.updateActionPolicy({
          data: { name: 'renamed' },
          options: { id: 'p-1', version: 'WzEsMV0=' },
        });

        expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
          ACTION_POLICY_SAVED_OBJECT_TYPE,
          'p-1',
          expect.objectContaining({ type: 'global', ruleId: null, name: 'renamed' }),
          { version: 'WzEsMV0=' }
        );
      });
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
            auth: {
              apiKey: 'encoded-es-api-key',
              owner: 'test-user',
              createdByUser: false,
            },
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
        type: 'global',
        enabled: false,
        destinations: [{ type: 'workflow', id: 'wf-before' }],
        matcher: 'env: production',
        groupBy: ['host.name'],
        snoozedUntil: '2099-01-01T00:00:00.000Z',
        auth: {
          apiKey: 'old-api-key',
          owner: 'old-user',
          createdByUser: false,
        },
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
            auth: {
              apiKey: 'encoded-es-api-key',
              owner: 'test-user',
              createdByUser: false,
            },
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
      type: 'global',
      enabled: true,
      destinations: [{ type: 'workflow', id: 'existing-workflow' }],
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
          auth: {
            apiKey: 'encoded-es-api-key',
            owner: 'test-user',
            createdByUser: false,
          },
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
          auth: {
            apiKey: 'user-created-key',
            owner: 'old-user',
            createdByUser: true,
          },
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
      type: 'global',
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
        type: 'global',
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
        type: 'global',
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

  describe('bulkActionActionPolicies', () => {
    it('issues a single bulkUpdate with partial attrs for mixed actions', async () => {
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
          {
            id: 'policy-3',
            type: ACTION_POLICY_SAVED_OBJECT_TYPE,
            attributes: {},
            references: [],
            version: 'WzUsMV0=',
          },
          {
            id: 'policy-4',
            type: ACTION_POLICY_SAVED_OBJECT_TYPE,
            attributes: {},
            references: [],
            version: 'WzYsMV0=',
          },
        ],
      });

      const res = await client.bulkActionActionPolicies({
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
            enabled: false,
            updatedBy: 'elastic_profile_uid',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
        },
        {
          type: ACTION_POLICY_SAVED_OBJECT_TYPE,
          id: 'policy-3',
          attributes: {
            snoozedUntil: '2025-06-01T12:00:00.000Z',
            updatedBy: 'elastic_profile_uid',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
        },
        {
          type: ACTION_POLICY_SAVED_OBJECT_TYPE,
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

      const res = await client.bulkActionActionPolicies({
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
            type: ACTION_POLICY_SAVED_OBJECT_TYPE,
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
            type: ACTION_POLICY_SAVED_OBJECT_TYPE,
            success: true,
          },
        ],
      });

      const res = await client.bulkActionActionPolicies({
        actions: [
          { id: 'policy-1', action: 'enable' },
          { id: 'policy-2', action: 'delete' },
        ],
      });

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
      ]);
      expect(mockSavedObjectsClient.bulkDelete).toHaveBeenCalledTimes(1);
      expect(mockSavedObjectsClient.bulkDelete).toHaveBeenCalledWith([
        { type: ACTION_POLICY_SAVED_OBJECT_TYPE, id: 'policy-2' },
      ]);

      expect(res).toEqual({ processed: 2, total: 2, errors: [] });
    });

    it('handles delete-only bulk actions without calling bulkUpdate', async () => {
      mockSavedObjectsClient.bulkDelete.mockResolvedValueOnce({
        statuses: [
          {
            id: 'policy-1',
            type: ACTION_POLICY_SAVED_OBJECT_TYPE,
            success: true,
          },
        ],
      });

      const res = await client.bulkActionActionPolicies({
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
            type: ACTION_POLICY_SAVED_OBJECT_TYPE,
            attributes: {} as ActionPolicySavedObjectAttributes,
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
            type: ACTION_POLICY_SAVED_OBJECT_TYPE,
            success: false,
            error: {
              statusCode: 404,
              error: 'Not Found',
              message: 'Not found',
            },
          },
        ],
      });

      const res = await client.bulkActionActionPolicies({
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
                  type: ACTION_POLICY_SAVED_OBJECT_TYPE,
                  attributes: {
                    auth: { apiKey: 'key-1', createdByUser: false, owner: 'test-user' },
                  },
                  references: [],
                },
                {
                  id: 'policy-del-2',
                  type: ACTION_POLICY_SAVED_OBJECT_TYPE,
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
          { id: 'policy-del-1', type: ACTION_POLICY_SAVED_OBJECT_TYPE, success: true },
          { id: 'policy-del-2', type: ACTION_POLICY_SAVED_OBJECT_TYPE, success: true },
        ],
      });

      const res = await client.bulkActionActionPolicies({
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
                  type: ACTION_POLICY_SAVED_OBJECT_TYPE,
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
        statuses: [{ id: 'policy-del-user', type: ACTION_POLICY_SAVED_OBJECT_TYPE, success: true }],
      });

      const res = await client.bulkActionActionPolicies({
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
        statuses: [{ id: 'policy-del-err', type: ACTION_POLICY_SAVED_OBJECT_TYPE, success: true }],
      });

      const res = await client.bulkActionActionPolicies({
        actions: [{ id: 'policy-del-err', action: 'delete' }],
      });

      expect(res).toEqual({ processed: 1, total: 1, errors: [] });
      expect(apiKeyService.markApiKeysForInvalidation).not.toHaveBeenCalled();
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
        type: 'global',
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
          auth: { apiKey: 'user-created-key', createdByUser: true, owner: 'test-user' },
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
          auth: { apiKey: 'user-created-key', owner: 'test-user', createdByUser: true },
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
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        attributes: {
          auth: { createdByUser: false, owner: 'test-user' },
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
});
