/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BULK_FILTER_MAX_RULES } from '@kbn/alerting-v2-schemas';
import type { KibanaRequest } from '@kbn/core-http-server';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';

import type { CreateRuleParams, UpdateRuleData } from './types';
import type { UserService } from '../services/user_service/user_service';
import type { RuleSavedObjectAttributes } from '../../saved_objects';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { RulesClient } from './rules_client';
import { createRulesSavedObjectService } from '../services/rules_saved_object_service/rules_saved_object_service.mock';
import { createUserService } from '../services/user_service/user_service.mock';
import { createRuleSoAttributes } from '../test_utils';

jest.mock('../rule_executor/schedule', () => ({
  ensureRuleExecutorTaskScheduled: jest.fn(),
  getRuleExecutorTaskId: jest.fn(),
}));

import { ensureRuleExecutorTaskScheduled, getRuleExecutorTaskId } from '../rule_executor/schedule';

const ensureRuleExecutorTaskScheduledMock = ensureRuleExecutorTaskScheduled as jest.MockedFunction<
  typeof ensureRuleExecutorTaskScheduled
>;
const getRuleExecutorTaskIdMock = getRuleExecutorTaskId as jest.MockedFunction<
  typeof getRuleExecutorTaskId
>;

const baseCreateData: CreateRuleParams['data'] = {
  kind: 'alert',
  metadata: { name: 'rule-1' },
  time_field: '@timestamp',
  schedule: { every: '1m', lookback: '1m' },
  evaluation: {
    query: {
      base: 'FROM logs-* | LIMIT 1',
    },
  },
};

const baseSoAttrs = createRuleSoAttributes({
  metadata: { name: 'rule-1' },
  time_field: '@timestamp',
  schedule: { every: '1m', lookback: '1m' },
  evaluation: {
    query: { base: 'FROM logs-* | LIMIT 1' },
  },
});

describe('RulesClient', () => {
  const request: KibanaRequest = httpServerMock.createKibanaRequest();
  const http = httpServiceMock.createStartContract();
  const taskManager = taskManagerMock.createStart();
  let userService: UserService;
  const { rulesSavedObjectService, mockSavedObjectsClient } = createRulesSavedObjectService();

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Default space
    http.basePath.get.mockReturnValue('/s/space-1');
    ({ userService } = createUserService());
    mockSavedObjectsClient.create.mockResolvedValue({
      id: 'rule-id-default',
      type: RULE_SAVED_OBJECT_TYPE,
      attributes: baseSoAttrs,
      references: [],
    });
    mockSavedObjectsClient.update.mockResolvedValue({
      id: 'rule-id-default',
      type: RULE_SAVED_OBJECT_TYPE,
      attributes: baseSoAttrs,
      references: [],
    });
    mockSavedObjectsClient.delete.mockResolvedValue({
      id: 'rule-id-default',
      type: RULE_SAVED_OBJECT_TYPE,
    });
    mockSavedObjectsClient.find.mockResolvedValue({
      saved_objects: [],
      total: 0,
      page: 1,
      per_page: 20,
    });
    mockSavedObjectsClient.bulkGet.mockResolvedValue({
      saved_objects: [],
    });

    ensureRuleExecutorTaskScheduledMock.mockResolvedValue({ id: 'task-123' });
    getRuleExecutorTaskIdMock.mockReturnValue('task:fallback');
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  function createClient() {
    return new RulesClient(request, http, rulesSavedObjectService, taskManager, userService);
  }

  describe('createRule', () => {
    it('creates a rule SO and schedules a task', async () => {
      const client = createClient();
      mockSavedObjectsClient.create.mockResolvedValueOnce({
        id: 'rule-id-1',
        type: RULE_SAVED_OBJECT_TYPE,
        attributes: baseSoAttrs,
        references: [],
      });

      const res = await client.createRule({
        data: baseCreateData,
        options: { id: 'rule-id-1' },
      });

      expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
        RULE_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          metadata: expect.objectContaining({ name: 'rule-1' }),
          enabled: true,
          createdBy: 'elastic',
        }),
        { id: 'rule-id-1', overwrite: false }
      );

      expect(ensureRuleExecutorTaskScheduledMock).toHaveBeenCalledWith({
        services: { taskManager },
        input: expect.objectContaining({
          ruleId: 'rule-id-1',
          schedule: { interval: '1m' },
          spaceId: 'space-1',
        }),
      });

      expect(res).toEqual(
        expect.objectContaining({
          id: 'rule-id-1',
          metadata: expect.objectContaining({ name: 'rule-1' }),
          enabled: true,
          createdBy: 'elastic',
          updatedBy: 'elastic',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        })
      );
    });

    it('cleans up the saved object if scheduling fails', async () => {
      const client = createClient();
      mockSavedObjectsClient.create.mockResolvedValueOnce({
        id: 'rule-id-3',
        type: RULE_SAVED_OBJECT_TYPE,
        attributes: baseSoAttrs,
        references: [],
      });
      ensureRuleExecutorTaskScheduledMock.mockRejectedValueOnce(new Error('schedule failed'));

      await expect(
        client.createRule({
          data: baseCreateData,
          options: { id: 'rule-id-3' },
        })
      ).rejects.toThrow('schedule failed');

      expect(mockSavedObjectsClient.delete).toHaveBeenCalledWith(
        RULE_SAVED_OBJECT_TYPE,
        'rule-id-3'
      );
    });

    it('throws 409 conflict when id already exists', async () => {
      const client = createClient();
      mockSavedObjectsClient.create.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createConflictError(RULE_SAVED_OBJECT_TYPE, 'rule-id-4')
      );

      await expect(
        client.createRule({
          data: baseCreateData,
          options: { id: 'rule-id-4' },
        })
      ).rejects.toMatchObject({
        output: { statusCode: 409 },
      });
    });

    it('creates a rule with description and includes it in the response', async () => {
      const client = createClient();
      const soAttrsWithDesc = createRuleSoAttributes({
        metadata: { name: 'rule-with-desc', description: 'My description' },
      });
      mockSavedObjectsClient.create.mockResolvedValueOnce({
        id: 'rule-id-desc',
        type: RULE_SAVED_OBJECT_TYPE,
        attributes: soAttrsWithDesc,
        references: [],
      });

      const res = await client.createRule({
        data: {
          ...baseCreateData,
          metadata: { name: 'rule-with-desc', description: 'My description' },
        },
        options: { id: 'rule-id-desc' },
      });

      expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
        RULE_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          metadata: expect.objectContaining({
            name: 'rule-with-desc',
            description: 'My description',
          }),
        }),
        { id: 'rule-id-desc', overwrite: false }
      );

      expect(res.metadata.description).toBe('My description');
    });

    it('throws 400 when ES|QL is invalid', async () => {
      const client = createClient();

      await expect(
        client.createRule({
          data: {
            ...baseCreateData,
            evaluation: {
              query: { base: 'FROM |' },
            },
          },
          options: { id: 'rule-id-5' },
        })
      ).rejects.toMatchObject({
        output: { statusCode: 400 },
      });
    });
  });

  describe('updateRule', () => {
    it('throws 404 when rule is not found', async () => {
      const client = createClient();
      mockSavedObjectsClient.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError(RULE_SAVED_OBJECT_TYPE, 'rule-id-1')
      );

      await expect(client.updateRule({ id: 'rule-id-1', data: {} })).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
    });

    it('updates a rule and re-schedules the task', async () => {
      const client = createClient();

      mockSavedObjectsClient.get.mockResolvedValueOnce({
        attributes: baseSoAttrs,
        version: 'WzEsMV0=',
        id: 'rule-id-1',
        type: RULE_SAVED_OBJECT_TYPE,
        references: [],
      });

      await client.updateRule({
        id: 'rule-id-1',
        data: { schedule: { every: '5m' } },
      });

      expect(ensureRuleExecutorTaskScheduledMock).toHaveBeenCalledWith({
        services: { taskManager },
        input: expect.objectContaining({
          ruleId: 'rule-id-1',
          schedule: { interval: '5m' },
          spaceId: 'space-1',
        }),
      });
      expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
        RULE_SAVED_OBJECT_TYPE,
        'rule-id-1',
        expect.objectContaining({
          schedule: expect.objectContaining({ every: '5m' }),
        }),
        { version: 'WzEsMV0=', mergeAttributes: false }
      );
    });

    it('updates the description of a rule', async () => {
      const client = createClient();

      mockSavedObjectsClient.get.mockResolvedValueOnce({
        attributes: baseSoAttrs,
        version: 'WzEsMV0=',
        id: 'rule-id-desc-update',
        type: RULE_SAVED_OBJECT_TYPE,
        references: [],
      });

      const res = await client.updateRule({
        id: 'rule-id-desc-update',
        data: { metadata: { description: 'New description' } },
      });

      expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
        RULE_SAVED_OBJECT_TYPE,
        'rule-id-desc-update',
        expect.objectContaining({
          metadata: expect.objectContaining({ description: 'New description' }),
        }),
        { version: 'WzEsMV0=', mergeAttributes: false }
      );

      expect(res.metadata.description).toBe('New description');
    });

    it('throws 409 conflict when version is stale', async () => {
      const client = createClient();

      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'rule-id-4',
        attributes: baseSoAttrs,
        version: 'WzEsMV0=',
        type: RULE_SAVED_OBJECT_TYPE,
        references: [],
      });

      mockSavedObjectsClient.update.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createConflictError(RULE_SAVED_OBJECT_TYPE, 'rule-id-4')
      );

      await expect(client.updateRule({ id: 'rule-id-4', data: {} })).rejects.toMatchObject({
        output: { statusCode: 409 },
      });
    });

    it('throws 400 when setting stateTransition on a signal rule', async () => {
      const client = createClient();

      const existingAttributes: RuleSavedObjectAttributes = {
        ...baseSoAttrs,
        kind: 'signal',
      };

      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'rule-id-signal',
        attributes: existingAttributes,
        version: 'WzEsMV0=',
        type: RULE_SAVED_OBJECT_TYPE,
        references: [],
      });

      await expect(
        client.updateRule({
          id: 'rule-id-signal',
          data: { state_transition: { pending_count: 3 } },
        })
      ).rejects.toMatchObject({
        output: { statusCode: 400 },
        message: 'stateTransition is only allowed for rules of kind "alert".',
      });

      expect(mockSavedObjectsClient.update).not.toHaveBeenCalled();
    });

    it('allows setting stateTransition on an alert rule', async () => {
      const client = createClient();

      const existingAttributes: RuleSavedObjectAttributes = {
        ...baseSoAttrs,
        kind: 'alert',
      };

      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'rule-id-alert',
        attributes: existingAttributes,
        version: 'WzEsMV0=',
        type: RULE_SAVED_OBJECT_TYPE,
        references: [],
      });

      await expect(
        client.updateRule({
          id: 'rule-id-alert',
          data: {
            state_transition: { pending_count: 3, recovering_count: 5 },
          },
        })
      ).resolves.not.toThrow();
    });

    it('allows setting stateTransition to null on a signal rule (removing it)', async () => {
      const client = createClient();

      const existingAttributes: RuleSavedObjectAttributes = {
        ...baseSoAttrs,
        kind: 'signal',
      };

      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'rule-id-signal-null',
        attributes: existingAttributes,
        version: 'WzEsMV0=',
        type: RULE_SAVED_OBJECT_TYPE,
        references: [],
      });

      await client.updateRule({
        id: 'rule-id-signal-null',
        data: { stateTransition: null } as unknown as UpdateRuleData,
      });
    });

    it('replaces state_transition entirely without preserving stale sub-fields', async () => {
      const client = createClient();

      const existingAttributes: RuleSavedObjectAttributes = {
        ...baseSoAttrs,
        kind: 'alert',
        state_transition: { pending_count: 2, recovering_count: 3 },
      };

      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'rule-partial-st',
        attributes: existingAttributes,
        version: 'WzEsMV0=',
        type: RULE_SAVED_OBJECT_TYPE,
        references: [],
      });

      await client.updateRule({
        id: 'rule-partial-st',
        data: { state_transition: { recovering_count: 3 } },
      });

      const savedAttrs = mockSavedObjectsClient.update.mock
        .calls[0][2] as RuleSavedObjectAttributes;
      expect(savedAttrs.state_transition).toEqual({ recovering_count: 3 });
      expect(
        (savedAttrs.state_transition as Record<string, unknown>)?.pending_count
      ).toBeUndefined();
    });

    it('clears artifacts when update payload sets artifacts to null', async () => {
      const client = createClient();

      const existingAttributes: RuleSavedObjectAttributes = {
        ...baseSoAttrs,
        artifacts: [{ id: 'runbook-id', type: 'runbook', value: 'Persisted runbook' }],
      };

      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'rule-id-clear-artifacts',
        attributes: existingAttributes,
        version: 'WzEsMV0=',
        type: RULE_SAVED_OBJECT_TYPE,
        references: [],
      });

      await client.updateRule({
        id: 'rule-id-clear-artifacts',
        data: { artifacts: null } as unknown as UpdateRuleData,
      });

      expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
        RULE_SAVED_OBJECT_TYPE,
        'rule-id-clear-artifacts',
        expect.objectContaining({
          artifacts: [],
        }),
        { version: 'WzEsMV0=', mergeAttributes: false }
      );
    });
  });

  describe('getRule', () => {
    it('returns a rule by id', async () => {
      const client = createClient();

      mockSavedObjectsClient.get.mockResolvedValueOnce({
        attributes: baseSoAttrs,
        version: 'WzEsMV0=',
        id: 'rule-id-get-1',
        type: RULE_SAVED_OBJECT_TYPE,
        references: [],
      });

      const res = await client.getRule({ id: 'rule-id-get-1' });

      expect(mockSavedObjectsClient.get).toHaveBeenCalledWith(
        RULE_SAVED_OBJECT_TYPE,
        'rule-id-get-1',
        undefined
      );
      expect(res).toEqual(
        expect.objectContaining({
          id: 'rule-id-get-1',
          kind: 'alert',
          metadata: expect.objectContaining({ name: 'rule-1' }),
          schedule: expect.objectContaining({ every: '1m' }),
        })
      );
    });

    it('returns description in the rule response when present', async () => {
      const client = createClient();
      const soAttrsWithDesc = createRuleSoAttributes({
        metadata: { name: 'rule-with-desc', description: 'Fetched description' },
      });

      mockSavedObjectsClient.get.mockResolvedValueOnce({
        attributes: soAttrsWithDesc,
        version: 'WzEsMV0=',
        id: 'rule-id-get-desc',
        type: RULE_SAVED_OBJECT_TYPE,
        references: [],
      });

      const res = await client.getRule({ id: 'rule-id-get-desc' });

      expect(res.metadata.description).toBe('Fetched description');
    });

    it('throws 404 when rule is not found', async () => {
      const client = createClient();
      mockSavedObjectsClient.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          RULE_SAVED_OBJECT_TYPE,
          'rule-id-get-404'
        )
      );

      await expect(client.getRule({ id: 'rule-id-get-404' })).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
    });
  });

  describe('getRules', () => {
    it('returns rules for the provided ids', async () => {
      const client = createClient();
      const so1Attrs = createRuleSoAttributes({
        metadata: { name: 'rule-get-many-1' },
      });
      const so2Attrs = createRuleSoAttributes({
        metadata: { name: 'rule-get-many-2' },
      });

      mockSavedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'rule-id-get-many-1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: so1Attrs,
            references: [],
          },
          {
            id: 'rule-id-get-many-2',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: so2Attrs,
            references: [],
          },
        ],
      });

      const res = await client.getRules(['rule-id-get-many-1', 'rule-id-get-many-2']);

      expect(mockSavedObjectsClient.bulkGet).toHaveBeenCalledWith(
        [
          { type: RULE_SAVED_OBJECT_TYPE, id: 'rule-id-get-many-1' },
          { type: RULE_SAVED_OBJECT_TYPE, id: 'rule-id-get-many-2' },
        ],
        undefined
      );
      expect(res).toHaveLength(2);
      expect(res[0]).toEqual(
        expect.objectContaining({
          id: 'rule-id-get-many-1',
          metadata: expect.objectContaining({ name: 'rule-get-many-1' }),
        })
      );
      expect(res[1]).toEqual(
        expect.objectContaining({
          id: 'rule-id-get-many-2',
          metadata: expect.objectContaining({ name: 'rule-get-many-2' }),
        })
      );
    });

    it('excludes missing ids returned as bulk get errors', async () => {
      const client = createClient();
      const soAttrs = createRuleSoAttributes({
        metadata: { name: 'rule-get-many-success' },
      });

      mockSavedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'rule-id-get-many-success',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: soAttrs,
            references: [],
          },
          {
            id: 'rule-id-get-many-missing',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: {} as RuleSavedObjectAttributes,
            references: [],
            error: {
              statusCode: 404,
              error: 'Not Found',
              message: 'Saved object [alerting-rule/rule-id-get-many-missing] not found',
            },
          },
        ],
      });

      const res = await client.getRules(['rule-id-get-many-success', 'rule-id-get-many-missing']);

      expect(res).toHaveLength(1);
      expect(res[0]).toEqual(
        expect.objectContaining({
          id: 'rule-id-get-many-success',
          metadata: expect.objectContaining({ name: 'rule-get-many-success' }),
        })
      );
    });

    it('ignores documents with non-404 errors and returns valid documents', async () => {
      const client = createClient();
      const validAttrs = createRuleSoAttributes({
        metadata: { name: 'rule-get-many-valid' },
      });

      mockSavedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'rule-id-get-many-valid',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: validAttrs,
            references: [],
          },
          {
            id: 'rule-id-get-many-failure',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: {} as RuleSavedObjectAttributes,
            references: [],
            error: {
              statusCode: 500,
              error: 'Internal Server Error',
              message: 'bulk get failed',
            },
          },
        ],
      });

      const res = await client.getRules(['rule-id-get-many-valid', 'rule-id-get-many-failure']);

      expect(res).toHaveLength(1);
      expect(res[0]).toEqual(
        expect.objectContaining({
          id: 'rule-id-get-many-valid',
          metadata: expect.objectContaining({ name: 'rule-get-many-valid' }),
        })
      );
    });
  });

  describe('deleteRule', () => {
    it('removes the scheduled task and deletes the rule', async () => {
      const client = createClient();

      mockSavedObjectsClient.get.mockResolvedValueOnce({
        attributes: baseSoAttrs,
        version: 'WzEsMV0=',
        id: 'rule-id-del-1',
        type: RULE_SAVED_OBJECT_TYPE,
        references: [],
      });
      getRuleExecutorTaskIdMock.mockReturnValueOnce('task:delete');

      await client.deleteRule({ id: 'rule-id-del-1' });

      expect(getRuleExecutorTaskIdMock).toHaveBeenCalledWith({
        ruleId: 'rule-id-del-1',
        spaceId: 'space-1',
      });
      expect(taskManager.removeIfExists).toHaveBeenCalledWith('task:delete');
      expect(mockSavedObjectsClient.delete).toHaveBeenCalledWith(
        RULE_SAVED_OBJECT_TYPE,
        'rule-id-del-1'
      );
    });

    it('throws 404 when rule is not found', async () => {
      const client = createClient();
      mockSavedObjectsClient.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          RULE_SAVED_OBJECT_TYPE,
          'rule-id-del-404'
        )
      );

      await expect(client.deleteRule({ id: 'rule-id-del-404' })).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
    });
  });

  describe('findRules', () => {
    it('returns a paginated list of rules', async () => {
      const client = createClient();

      const so1 = {
        id: 'rule-1',
        type: RULE_SAVED_OBJECT_TYPE,
        references: [],
        score: 0,
        attributes: createRuleSoAttributes({
          metadata: { name: 'rule-1' },
        }),
      };
      const so2 = {
        id: 'rule-2',
        type: RULE_SAVED_OBJECT_TYPE,
        references: [],
        score: 0,
        attributes: createRuleSoAttributes({
          metadata: { name: 'rule-2' },
        }),
      };

      mockSavedObjectsClient.find.mockResolvedValueOnce({
        saved_objects: [so1, so2],
        total: 2,
        page: 2,
        per_page: 50,
      });

      const res = await client.findRules({ page: 2, perPage: 50 });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith({
        type: RULE_SAVED_OBJECT_TYPE,
        page: 2,
        perPage: 50,
        sortField: 'updatedAt',
        sortOrder: 'desc',
      });

      expect(res.items).toHaveLength(2);
      expect(res.items[0]).toEqual(
        expect.objectContaining({
          id: 'rule-1',
          metadata: expect.objectContaining({ name: 'rule-1' }),
        })
      );
      expect(res.items[1]).toEqual(
        expect.objectContaining({
          id: 'rule-2',
          metadata: expect.objectContaining({ name: 'rule-2' }),
        })
      );
      expect(res.total).toBe(2);
      expect(res.page).toBe(2);
      expect(res.perPage).toBe(50);
    });

    it('uses default pagination when no page params are provided', async () => {
      const client = createClient();

      const so1 = {
        id: 'rule-pagination-1',
        type: RULE_SAVED_OBJECT_TYPE,
        references: [],
        score: 0,
        attributes: createRuleSoAttributes({
          metadata: { name: 'rule-pagination-1' },
        }),
      };

      mockSavedObjectsClient.find.mockResolvedValueOnce({
        saved_objects: [so1],
        total: 100,
        page: 1,
        per_page: 20,
      });

      const res = await client.findRules();

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith({
        type: RULE_SAVED_OBJECT_TYPE,
        page: 1,
        perPage: 20,
        sortField: 'updatedAt',
        sortOrder: 'desc',
      });
      expect(mockSavedObjectsClient.bulkGet).not.toHaveBeenCalled();

      expect(res.total).toBe(100);
      expect(res.page).toBe(1);
      expect(res.perPage).toBe(20);
    });

    it('translates clean API filter to SO filter before passing to saved objects client', async () => {
      const client = createClient();

      mockSavedObjectsClient.find.mockResolvedValueOnce({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 20,
      });

      await client.findRules({ filter: 'enabled: true' });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith({
        type: RULE_SAVED_OBJECT_TYPE,
        page: 1,
        perPage: 20,
        sortField: 'updatedAt',
        sortOrder: 'desc',
        filter: `${RULE_SAVED_OBJECT_TYPE}.attributes.enabled: true`,
      });
    });

    it('translates search into name and tag prefix query', async () => {
      const client = createClient();

      mockSavedObjectsClient.find.mockResolvedValueOnce({
        saved_objects: [],
        total: 0,
        page: 2,
        per_page: 10,
      });

      await client.findRules({ page: 2, perPage: 10, search: 'prod alerts' });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith({
        type: RULE_SAVED_OBJECT_TYPE,
        page: 2,
        perPage: 10,
        sortField: 'updatedAt',
        sortOrder: 'desc',
        filter: expect.any(String),
      });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.stringContaining(
            'alerting_rule.attributes.metadata.name: alerts* OR alerting_rule.attributes.metadata.tags: alerts*'
          ),
        })
      );
    });

    it('trims search before passing it to the saved objects client', async () => {
      const client = createClient();

      mockSavedObjectsClient.find.mockResolvedValueOnce({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 20,
      });

      await client.findRules({ search: '  prod alerts  ' });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.stringContaining(
            'alerting_rule.attributes.metadata.name: alerts* OR alerting_rule.attributes.metadata.tags: alerts*'
          ),
        })
      );
    });

    it('passes filters and search together', async () => {
      const client = createClient();

      mockSavedObjectsClient.find.mockResolvedValueOnce({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 20,
      });

      await client.findRules({ filter: 'enabled: true', search: 'prod' });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.stringContaining(`${RULE_SAVED_OBJECT_TYPE}.attributes.enabled: true`),
        })
      );
      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.stringContaining(
            'alerting_rule.attributes.metadata.name: prod* OR alerting_rule.attributes.metadata.tags: prod*'
          ),
        })
      );
    });

    it('does not pass filter when it is undefined', async () => {
      const client = createClient();

      mockSavedObjectsClient.find.mockResolvedValueOnce({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 20,
      });

      await client.findRules({});

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith({
        type: RULE_SAVED_OBJECT_TYPE,
        page: 1,
        perPage: 20,
        sortField: 'updatedAt',
        sortOrder: 'desc',
      });
    });

    it('maps kind sorting without transformation', async () => {
      const client = createClient();

      mockSavedObjectsClient.find.mockResolvedValueOnce({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 20,
      });

      await client.findRules({ sortField: 'kind', sortOrder: 'desc' });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          sortField: 'kind',
          sortOrder: 'desc',
        })
      );
    });

    it('maps enabled sorting without transformation', async () => {
      const client = createClient();

      mockSavedObjectsClient.find.mockResolvedValueOnce({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 20,
      });

      await client.findRules({ sortField: 'enabled', sortOrder: 'desc' });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          sortField: 'enabled',
          sortOrder: 'desc',
        })
      );
    });
  });

  describe('bulkDeleteRules', () => {
    it('removes tasks and deletes saved objects for all ids', async () => {
      const client = createClient();

      getRuleExecutorTaskIdMock
        .mockReturnValueOnce('task:rule-1')
        .mockReturnValueOnce('task:rule-2');

      mockSavedObjectsClient.bulkDelete.mockResolvedValueOnce({
        statuses: [
          { id: 'rule-1', type: RULE_SAVED_OBJECT_TYPE, success: true },
          { id: 'rule-2', type: RULE_SAVED_OBJECT_TYPE, success: true },
        ],
      });

      const res = await client.bulkDeleteRules({ ids: ['rule-1', 'rule-2'] });

      expect(taskManager.bulkRemove).toHaveBeenCalledWith(['task:rule-1', 'task:rule-2']);
      expect(mockSavedObjectsClient.bulkDelete).toHaveBeenCalledWith([
        { type: RULE_SAVED_OBJECT_TYPE, id: 'rule-1' },
        { type: RULE_SAVED_OBJECT_TYPE, id: 'rule-2' },
      ]);
      expect(res.rules).toEqual([]);
      expect(res.errors).toEqual([]);
    });

    it('returns errors for rules that failed to delete', async () => {
      const client = createClient();

      getRuleExecutorTaskIdMock
        .mockReturnValueOnce('task:rule-1')
        .mockReturnValueOnce('task:rule-2');

      mockSavedObjectsClient.bulkDelete.mockResolvedValueOnce({
        statuses: [
          { id: 'rule-1', type: RULE_SAVED_OBJECT_TYPE, success: true },
          {
            id: 'rule-2',
            type: RULE_SAVED_OBJECT_TYPE,
            success: false,
            error: { error: 'Not Found', message: 'Rule not found', statusCode: 404 },
          },
        ],
      });

      const res = await client.bulkDeleteRules({ ids: ['rule-1', 'rule-2'] });

      expect(res.rules).toEqual([]);
      expect(res.errors).toEqual([
        { id: 'rule-2', error: { message: 'Rule not found', statusCode: 404 } },
      ]);
    });

    it('continues with deletion even if task removal fails', async () => {
      const client = createClient();

      getRuleExecutorTaskIdMock
        .mockReturnValueOnce('task:rule-1')
        .mockReturnValueOnce('task:rule-2');

      taskManager.bulkRemove.mockRejectedValueOnce(new Error('task removal failed'));

      mockSavedObjectsClient.bulkDelete.mockResolvedValueOnce({
        statuses: [
          { id: 'rule-1', type: RULE_SAVED_OBJECT_TYPE, success: true },
          { id: 'rule-2', type: RULE_SAVED_OBJECT_TYPE, success: true },
        ],
      });

      const res = await client.bulkDeleteRules({ ids: ['rule-1', 'rule-2'] });

      expect(res.errors).toEqual([]);
    });

    it('resolves IDs via filter when filter is provided instead of ids', async () => {
      const client = createClient();

      mockSavedObjectsClient.find.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'filter-rule-1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: baseSoAttrs,
            references: [],
            score: 0,
          },
          {
            id: 'filter-rule-2',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: baseSoAttrs,
            references: [],
            score: 0,
          },
        ],
        total: 2,
        page: 1,
        per_page: 100,
      });

      getRuleExecutorTaskIdMock
        .mockReturnValueOnce('task:filter-rule-1')
        .mockReturnValueOnce('task:filter-rule-2');

      mockSavedObjectsClient.bulkDelete.mockResolvedValueOnce({
        statuses: [
          { id: 'filter-rule-1', type: RULE_SAVED_OBJECT_TYPE, success: true },
          { id: 'filter-rule-2', type: RULE_SAVED_OBJECT_TYPE, success: true },
        ],
      });

      const res = await client.bulkDeleteRules({ filter: 'enabled: true' });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: `${RULE_SAVED_OBJECT_TYPE}.attributes.enabled: true`,
        })
      );
      expect(mockSavedObjectsClient.bulkDelete).toHaveBeenCalledWith([
        { type: RULE_SAVED_OBJECT_TYPE, id: 'filter-rule-1' },
        { type: RULE_SAVED_OBJECT_TYPE, id: 'filter-rule-2' },
      ]);
      expect(res.errors).toEqual([]);
      expect(res.truncated).toBeUndefined();
    });

    it('caps filter-based bulk delete at BULK_FILTER_MAX_RULES and returns truncation metadata', async () => {
      const client = createClient();
      const excessTotal = BULK_FILTER_MAX_RULES + 42;

      mockSavedObjectsClient.find.mockImplementation((opts: { page?: number }) => {
        const p = opts.page ?? 1;
        const pageSize = 100;
        const savedObjects = Array.from({ length: pageSize }, (_, i) => ({
          id: `cap-rule-${(p - 1) * pageSize + i}`,
          type: RULE_SAVED_OBJECT_TYPE,
          attributes: baseSoAttrs,
          references: [],
          score: 0,
        }));
        return Promise.resolve({
          saved_objects: savedObjects,
          total: excessTotal,
          page: p,
          per_page: pageSize,
        });
      });

      getRuleExecutorTaskIdMock.mockImplementation(({ ruleId }) => `task:${ruleId}`);

      mockSavedObjectsClient.bulkDelete.mockImplementation(
        async (docs: Array<{ type: string; id: string }>) => ({
          statuses: docs.map(({ id }) => ({
            id,
            type: RULE_SAVED_OBJECT_TYPE,
            success: true,
          })),
        })
      );

      const res = await client.bulkDeleteRules({ filter: 'kind: alert' });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledTimes(BULK_FILTER_MAX_RULES / 100);
      const bulkDeleteArg = mockSavedObjectsClient.bulkDelete.mock.calls[0][0] as Array<{
        id: string;
      }>;
      expect(bulkDeleteArg).toHaveLength(BULK_FILTER_MAX_RULES);
      expect(bulkDeleteArg[0].id).toBe('cap-rule-0');
      expect(bulkDeleteArg[BULK_FILTER_MAX_RULES - 1].id).toBe(
        `cap-rule-${BULK_FILTER_MAX_RULES - 1}`
      );
      expect(res.truncated).toBe(true);
      expect(res.totalMatched).toBe(excessTotal);
      expect(res.errors).toEqual([]);
    });

    it('paginates through all results when filter matches more than one page', async () => {
      const client = createClient();

      // First page: 2 results out of 3 total
      mockSavedObjectsClient.find.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'page-1-rule-1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: baseSoAttrs,
            references: [],
            score: 0,
          },
          {
            id: 'page-1-rule-2',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: baseSoAttrs,
            references: [],
            score: 0,
          },
        ],
        total: 3,
        page: 1,
        per_page: 100,
      });

      // Second page: 1 remaining result
      mockSavedObjectsClient.find.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'page-2-rule-1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: baseSoAttrs,
            references: [],
            score: 0,
          },
        ],
        total: 3,
        page: 2,
        per_page: 100,
      });

      getRuleExecutorTaskIdMock
        .mockReturnValueOnce('task:1')
        .mockReturnValueOnce('task:2')
        .mockReturnValueOnce('task:3');

      mockSavedObjectsClient.bulkDelete.mockResolvedValueOnce({
        statuses: [
          { id: 'page-1-rule-1', type: RULE_SAVED_OBJECT_TYPE, success: true },
          { id: 'page-1-rule-2', type: RULE_SAVED_OBJECT_TYPE, success: true },
          { id: 'page-2-rule-1', type: RULE_SAVED_OBJECT_TYPE, success: true },
        ],
      });

      const res = await client.bulkDeleteRules({ filter: 'kind: alert' });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledTimes(2);
      expect(mockSavedObjectsClient.bulkDelete).toHaveBeenCalledWith([
        { type: RULE_SAVED_OBJECT_TYPE, id: 'page-1-rule-1' },
        { type: RULE_SAVED_OBJECT_TYPE, id: 'page-1-rule-2' },
        { type: RULE_SAVED_OBJECT_TYPE, id: 'page-2-rule-1' },
      ]);
      expect(res.errors).toEqual([]);
    });

    it('returns empty result when filter matches no rules', async () => {
      const client = createClient();

      mockSavedObjectsClient.find.mockResolvedValueOnce({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 100,
      });

      const res = await client.bulkDeleteRules({ filter: 'kind: nonexistent' });

      expect(mockSavedObjectsClient.bulkDelete).not.toHaveBeenCalled();
      expect(res).toEqual({ rules: [], errors: [] });
    });
  });

  describe('bulkEnableRules', () => {
    it('enables disabled rules and returns updated responses', async () => {
      const client = createClient();

      const disabledAttrs = createRuleSoAttributes({
        metadata: { name: 'disabled-rule' },
        enabled: false,
      });

      mockSavedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'rule-1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: disabledAttrs,
            version: 'v1',
            references: [],
          },
        ],
      });

      mockSavedObjectsClient.bulkUpdate.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'rule-1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: { ...disabledAttrs, enabled: true },
            references: [],
          },
        ],
      });

      const res = await client.bulkEnableRules({ ids: ['rule-1'] });

      expect(mockSavedObjectsClient.bulkUpdate).toHaveBeenCalledWith([
        expect.objectContaining({
          type: RULE_SAVED_OBJECT_TYPE,
          id: 'rule-1',
          attributes: expect.objectContaining({
            enabled: true,
            updatedBy: 'elastic_profile_uid',
            updatedAt: '2025-01-01T00:00:00.000Z',
          }),
        }),
      ]);

      expect(taskManager.bulkSchedule).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            id: 'task:fallback',
            params: expect.objectContaining({ ruleId: 'rule-1' }),
            enabled: true,
          }),
        ],
        expect.objectContaining({ request })
      );

      expect(res.rules).toHaveLength(1);
      expect(res.rules[0]).toEqual(expect.objectContaining({ id: 'rule-1', enabled: true }));
      expect(res.errors).toEqual([]);
    });

    it('skips already-enabled rules without updating them', async () => {
      const client = createClient();

      const enabledAttrs = createRuleSoAttributes({
        metadata: { name: 'enabled-rule' },
        enabled: true,
      });

      mockSavedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'rule-1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: enabledAttrs,
            version: 'v1',
            references: [],
          },
        ],
      });

      const res = await client.bulkEnableRules({ ids: ['rule-1'] });

      expect(mockSavedObjectsClient.bulkUpdate).not.toHaveBeenCalled();
      expect(res.rules).toHaveLength(1);
      expect(res.rules[0]).toEqual(expect.objectContaining({ id: 'rule-1', enabled: true }));
      expect(res.errors).toEqual([]);
    });

    it('returns errors for rules that fail to fetch', async () => {
      const client = createClient();

      mockSavedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'rule-missing',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: {} as RuleSavedObjectAttributes,
            references: [],
            error: {
              statusCode: 404,
              error: 'Not Found',
              message: 'Saved object not found',
            },
          },
        ],
      });

      const res = await client.bulkEnableRules({ ids: ['rule-missing'] });

      expect(res.rules).toEqual([]);
      expect(res.errors).toEqual([
        { id: 'rule-missing', error: { message: 'Saved object not found', statusCode: 404 } },
      ]);
    });

    it('returns errors for rules that fail to update', async () => {
      const client = createClient();

      const disabledAttrs = createRuleSoAttributes({
        metadata: { name: 'disabled-rule' },
        enabled: false,
      });

      mockSavedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'rule-1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: disabledAttrs,
            version: 'v1',
            references: [],
          },
        ],
      });

      mockSavedObjectsClient.bulkUpdate.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'rule-1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: {} as RuleSavedObjectAttributes,
            references: [],
            error: {
              statusCode: 409,
              error: 'Conflict',
              message: 'Version conflict',
            },
          },
        ],
      });

      const res = await client.bulkEnableRules({ ids: ['rule-1'] });

      expect(res.rules).toEqual([]);
      expect(res.errors).toEqual([
        { id: 'rule-1', error: { message: 'Version conflict', statusCode: 409 } },
      ]);
    });

    it('resolves IDs via filter and enables matching rules', async () => {
      const client = createClient();

      const disabledAttrs = createRuleSoAttributes({
        metadata: { name: 'disabled-rule' },
        enabled: false,
      });

      // resolveRuleIds find call
      mockSavedObjectsClient.find.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'filter-rule-1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: disabledAttrs,
            references: [],
            score: 0,
          },
        ],
        total: 1,
        page: 1,
        per_page: 100,
      });

      // bulkGetByIds
      mockSavedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'filter-rule-1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: disabledAttrs,
            version: 'v1',
            references: [],
          },
        ],
      });

      // bulkUpdate
      mockSavedObjectsClient.bulkUpdate.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'filter-rule-1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: { ...disabledAttrs, enabled: true },
            references: [],
          },
        ],
      });

      const res = await client.bulkEnableRules({ filter: 'enabled: false' });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: `${RULE_SAVED_OBJECT_TYPE}.attributes.enabled: false`,
        })
      );
      expect(res.rules).toHaveLength(1);
      expect(res.rules[0]).toEqual(expect.objectContaining({ id: 'filter-rule-1', enabled: true }));
      expect(res.errors).toEqual([]);
    });

    it('returns empty result when filter matches no rules', async () => {
      const client = createClient();

      mockSavedObjectsClient.find.mockResolvedValueOnce({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 100,
      });

      const res = await client.bulkEnableRules({ filter: 'kind: nonexistent' });

      expect(mockSavedObjectsClient.bulkGet).not.toHaveBeenCalled();
      expect(res).toEqual({ rules: [], errors: [] });
    });
  });

  describe('bulkDisableRules', () => {
    it('disables enabled rules and calls bulkDisable on task manager', async () => {
      const client = createClient();

      const enabledAttrs = createRuleSoAttributes({
        metadata: { name: 'enabled-rule' },
        enabled: true,
      });

      mockSavedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'rule-1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: enabledAttrs,
            version: 'v1',
            references: [],
          },
        ],
      });

      mockSavedObjectsClient.bulkUpdate.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'rule-1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: { ...enabledAttrs, enabled: false },
            references: [],
          },
        ],
      });

      getRuleExecutorTaskIdMock.mockReturnValueOnce('task:rule-1');

      const res = await client.bulkDisableRules({ ids: ['rule-1'] });

      expect(mockSavedObjectsClient.bulkUpdate).toHaveBeenCalledWith([
        expect.objectContaining({
          type: RULE_SAVED_OBJECT_TYPE,
          id: 'rule-1',
          attributes: expect.objectContaining({
            enabled: false,
            updatedBy: 'elastic_profile_uid',
            updatedAt: '2025-01-01T00:00:00.000Z',
          }),
        }),
      ]);

      expect(taskManager.bulkDisable).toHaveBeenCalledWith(['task:rule-1']);

      expect(res.rules).toHaveLength(1);
      expect(res.rules[0]).toEqual(expect.objectContaining({ id: 'rule-1', enabled: false }));
      expect(res.errors).toEqual([]);
    });

    it('skips already-disabled rules without updating them', async () => {
      const client = createClient();

      const disabledAttrs = createRuleSoAttributes({
        metadata: { name: 'disabled-rule' },
        enabled: false,
      });

      mockSavedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'rule-1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: disabledAttrs,
            version: 'v1',
            references: [],
          },
        ],
      });

      const res = await client.bulkDisableRules({ ids: ['rule-1'] });

      expect(mockSavedObjectsClient.bulkUpdate).not.toHaveBeenCalled();
      expect(taskManager.bulkDisable).not.toHaveBeenCalled();
      expect(res.rules).toHaveLength(1);
      expect(res.rules[0]).toEqual(expect.objectContaining({ id: 'rule-1', enabled: false }));
      expect(res.errors).toEqual([]);
    });

    it('returns errors for rules that fail to fetch', async () => {
      const client = createClient();

      mockSavedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'rule-missing',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: {} as RuleSavedObjectAttributes,
            references: [],
            error: {
              statusCode: 404,
              error: 'Not Found',
              message: 'Saved object not found',
            },
          },
        ],
      });

      const res = await client.bulkDisableRules({ ids: ['rule-missing'] });

      expect(res.rules).toEqual([]);
      expect(res.errors).toEqual([
        { id: 'rule-missing', error: { message: 'Saved object not found', statusCode: 404 } },
      ]);
    });

    it('continues even if bulkDisable on task manager fails', async () => {
      const client = createClient();

      const enabledAttrs = createRuleSoAttributes({
        metadata: { name: 'enabled-rule' },
        enabled: true,
      });

      mockSavedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'rule-1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: enabledAttrs,
            version: 'v1',
            references: [],
          },
        ],
      });

      mockSavedObjectsClient.bulkUpdate.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'rule-1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: { ...enabledAttrs, enabled: false },
            references: [],
          },
        ],
      });

      getRuleExecutorTaskIdMock.mockReturnValueOnce('task:rule-1');
      taskManager.bulkDisable.mockRejectedValueOnce(new Error('task disable failed'));

      const res = await client.bulkDisableRules({ ids: ['rule-1'] });

      expect(res.rules).toHaveLength(1);
      expect(res.errors).toEqual([]);
    });

    it('resolves IDs via filter and disables matching rules', async () => {
      const client = createClient();

      const enabledAttrs = createRuleSoAttributes({
        metadata: { name: 'enabled-rule' },
        enabled: true,
      });

      // resolveRuleIds find call
      mockSavedObjectsClient.find.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'filter-rule-1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: enabledAttrs,
            references: [],
            score: 0,
          },
        ],
        total: 1,
        page: 1,
        per_page: 100,
      });

      // bulkGetByIds
      mockSavedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'filter-rule-1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: enabledAttrs,
            version: 'v1',
            references: [],
          },
        ],
      });

      // bulkUpdate
      mockSavedObjectsClient.bulkUpdate.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'filter-rule-1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: { ...enabledAttrs, enabled: false },
            references: [],
          },
        ],
      });

      getRuleExecutorTaskIdMock.mockReturnValueOnce('task:filter-rule-1');

      const res = await client.bulkDisableRules({ filter: 'enabled: true' });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: `${RULE_SAVED_OBJECT_TYPE}.attributes.enabled: true`,
        })
      );
      expect(res.rules).toHaveLength(1);
      expect(res.rules[0]).toEqual(
        expect.objectContaining({ id: 'filter-rule-1', enabled: false })
      );
      expect(res.errors).toEqual([]);
    });

    it('returns empty result when filter matches no rules', async () => {
      const client = createClient();

      mockSavedObjectsClient.find.mockResolvedValueOnce({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 100,
      });

      const res = await client.bulkDisableRules({ filter: 'kind: nonexistent' });

      expect(mockSavedObjectsClient.bulkGet).not.toHaveBeenCalled();
      expect(res).toEqual({ rules: [], errors: [] });
    });
  });

  describe('resolveRuleIds (via bulk operations)', () => {
    it('throws 400 when both ids and filter are provided', async () => {
      const client = createClient();

      await expect(
        client.bulkDeleteRules({ ids: ['rule-1'], filter: 'some-filter' } as any)
      ).rejects.toMatchObject({
        output: { statusCode: 400 },
        message: 'Only one of ids or filter can be provided',
      });
    });
  });
});
