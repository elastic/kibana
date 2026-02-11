/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';

import type { CreateRuleParams, UpdateRuleData } from './types';
import type { UserService } from '../services/user_service/user_service';
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
  metadata: { name: 'rule-1', time_field: '@timestamp' },
  schedule: { every: '1m', lookback: '1m' },
  evaluation: {
    query: {
      base: 'FROM logs-* | LIMIT 1',
      trigger: { condition: 'WHERE true' },
    },
  },
};

const baseSoAttrs = createRuleSoAttributes({
  metadata: { name: 'rule-1', time_field: '@timestamp' },
  schedule: { every: '1m', lookback: '1m' },
  evaluation: {
    query: { base: 'FROM logs-* | LIMIT 1', trigger: { condition: 'WHERE true' } },
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
          createdBy: 'elastic_profile_uid',
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
          createdBy: 'elastic_profile_uid',
          updatedBy: 'elastic_profile_uid',
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

    it('throws 400 when ES|QL is invalid', async () => {
      const client = createClient();

      await expect(
        client.createRule({
          data: {
            ...baseCreateData,
            evaluation: {
              query: { base: 'FROM |', trigger: { condition: 'WHERE true' } },
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

      await expect(
        client.updateRule({ id: 'rule-id-1', data: {} as UpdateRuleData })
      ).rejects.toMatchObject({
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
        { version: 'WzEsMV0=' }
      );
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

      await expect(
        client.updateRule({ id: 'rule-id-4', data: {} as UpdateRuleData })
      ).rejects.toMatchObject({
        output: { statusCode: 409 },
      });
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
          metadata: { name: 'rule-1', time_field: '@timestamp' },
        }),
      };
      const so2 = {
        id: 'rule-2',
        type: RULE_SAVED_OBJECT_TYPE,
        references: [],
        score: 0,
        attributes: createRuleSoAttributes({
          metadata: { name: 'rule-2', time_field: '@timestamp' },
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
  });
});
