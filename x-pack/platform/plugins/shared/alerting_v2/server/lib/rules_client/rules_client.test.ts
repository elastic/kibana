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
import { RULE_SAVED_OBJECT_TYPE, type RuleSavedObjectAttributes } from '../../saved_objects';
import { RulesClient } from './rules_client';
import { createRulesSavedObjectService } from '../services/rules_saved_object_service/rules_saved_object_service.mock';
import { createUserService } from '../services/user_service/user_service.mock';

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

describe('RulesClient', () => {
  const request: KibanaRequest = httpServerMock.createKibanaRequest();
  const http = httpServiceMock.createStartContract();
  const taskManager = taskManagerMock.createStart();
  let userService: UserService;
  const { rulesSavedObjectService, mockSavedObjectsClient } = createRulesSavedObjectService();

  const baseCreateData: CreateRuleParams['data'] = {
    name: 'rule-1',
    kind: 'alert',
    tags: [],
    schedule: { custom: '1m' },
    enabled: true,
    query: 'FROM logs-* | LIMIT 1',
    timeField: '@timestamp',
    lookbackWindow: '1m',
    groupingKey: [],
  };

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
      attributes: baseCreateData,
      references: [],
    });
    mockSavedObjectsClient.update.mockResolvedValue({
      id: 'rule-id-default',
      type: RULE_SAVED_OBJECT_TYPE,
      attributes: baseCreateData,
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
    it('creates a rule SO and does not schedule a task when disabled', async () => {
      const client = createClient();
      mockSavedObjectsClient.create.mockResolvedValueOnce({
        id: 'rule-id-1',
        type: RULE_SAVED_OBJECT_TYPE,
        attributes: baseCreateData,
        references: [],
      });

      const res = await client.createRule({
        data: { ...baseCreateData, enabled: false },
        options: { id: 'rule-id-1' },
      });

      expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
        RULE_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          name: 'rule-1',
          enabled: false,
          createdBy: 'elastic_profile_uid',
        }),
        { id: 'rule-id-1', overwrite: false }
      );

      expect(ensureRuleExecutorTaskScheduledMock).not.toHaveBeenCalled();
      expect(mockSavedObjectsClient.update).not.toHaveBeenCalled();

      expect(res).toEqual(
        expect.objectContaining({
          id: 'rule-id-1',
          enabled: false,
          createdBy: 'elastic_profile_uid',
          updatedBy: 'elastic_profile_uid',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        })
      );
    });

    it('schedules a task when enabled', async () => {
      const client = createClient();
      mockSavedObjectsClient.create.mockResolvedValueOnce({
        id: 'rule-id-2',
        type: RULE_SAVED_OBJECT_TYPE,
        attributes: baseCreateData,
        references: [],
      });

      const res = await client.createRule({
        data: { ...baseCreateData, enabled: true },
        options: { id: 'rule-id-2' },
      });

      expect(ensureRuleExecutorTaskScheduledMock).toHaveBeenCalledWith({
        services: { taskManager },
        input: expect.objectContaining({
          ruleId: 'rule-id-2',
          schedule: { interval: '1m' },
          spaceId: 'space-1',
        }),
      });
      expect(mockSavedObjectsClient.update).not.toHaveBeenCalled();
      expect(res).toEqual(
        expect.objectContaining({
          id: 'rule-id-2',
          enabled: true,
        })
      );
    });

    it('cleans up the saved object if scheduling fails', async () => {
      const client = createClient();
      mockSavedObjectsClient.create.mockResolvedValueOnce({
        id: 'rule-id-3',
        type: RULE_SAVED_OBJECT_TYPE,
        attributes: baseCreateData,
        references: [],
      });
      ensureRuleExecutorTaskScheduledMock.mockRejectedValueOnce(new Error('schedule failed'));

      await expect(
        client.createRule({
          data: { ...baseCreateData, enabled: true },
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
          data: { ...baseCreateData, enabled: false },
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
          data: { ...baseCreateData, query: 'FROM |' },
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

    it('disables a rule by removing task', async () => {
      const client = createClient();

      const existingAttributes: RuleSavedObjectAttributes = {
        ...baseCreateData,
        enabled: true,
        createdBy: 'elastic_profile_uid',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'elastic_profile_uid',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        attributes: existingAttributes,
        version: 'WzEsMV0=',
        id: 'rule-id-1',
        type: RULE_SAVED_OBJECT_TYPE,
        references: [],
      });

      await client.updateRule({
        id: 'rule-id-1',
        data: { enabled: false },
      });

      expect(getRuleExecutorTaskIdMock).toHaveBeenCalledWith({
        ruleId: 'rule-id-1',
        spaceId: 'space-1',
      });
      expect(taskManager.removeIfExists).toHaveBeenCalledWith('task:fallback');
      expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
        RULE_SAVED_OBJECT_TYPE,
        'rule-id-1',
        expect.objectContaining({ enabled: false }),
        { version: 'WzEsMV0=' }
      );
    });

    it('enables a rule by ensuring the task exists', async () => {
      const client = createClient();

      const existingAttributes: RuleSavedObjectAttributes = {
        ...baseCreateData,
        enabled: false,
        createdBy: 'elastic_profile_uid',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'elastic_profile_uid',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        attributes: existingAttributes,
        version: 'WzEsMV0=',
        id: 'rule-id-2',
        type: RULE_SAVED_OBJECT_TYPE,
        references: [],
      });

      await client.updateRule({
        id: 'rule-id-2',
        data: { enabled: true },
      });

      expect(ensureRuleExecutorTaskScheduledMock).toHaveBeenCalled();
      expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
        RULE_SAVED_OBJECT_TYPE,
        'rule-id-2',
        expect.objectContaining({ enabled: true }),
        { version: 'WzEsMV0=' }
      );
    });

    it('throws 409 conflict when version is stale', async () => {
      const client = createClient();

      const existingAttributes: RuleSavedObjectAttributes = {
        ...baseCreateData,
        enabled: false,
        createdBy: 'elastic_profile_uid',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'elastic_profile_uid',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'rule-id-4',
        attributes: existingAttributes,
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
        ...baseCreateData,
        kind: 'signal',
        enabled: true,
        createdBy: 'elastic',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'elastic',
        updatedAt: '2025-01-01T00:00:00.000Z',
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
          data: { stateTransition: { pendingCount: 3 } },
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
        ...baseCreateData,
        kind: 'alert',
        enabled: true,
        createdBy: 'elastic',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'elastic',
        updatedAt: '2025-01-01T00:00:00.000Z',
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
            stateTransition: { pendingCount: 3, recoveringCount: 5 },
          },
        })
      ).resolves.not.toThrow();
    });

    it('allows setting stateTransition to null on a signal rule (removing it)', async () => {
      const client = createClient();

      const existingAttributes: RuleSavedObjectAttributes = {
        ...baseCreateData,
        kind: 'signal',
        enabled: true,
        createdBy: 'elastic',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'elastic',
        updatedAt: '2025-01-01T00:00:00.000Z',
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

      await expect(
        client.updateRule({
          id: 'rule-id-alert',
          data: {
            stateTransition: { pendingCount: 3, recoveringCount: 5 },
          },
        })
      ).resolves.not.toThrow();
    });
  });

  describe('getRule', () => {
    it('returns a rule by id', async () => {
      const client = createClient();

      const existingAttributes: RuleSavedObjectAttributes = {
        ...baseCreateData,
        enabled: true,
        createdBy: 'elastic_profile_uid',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'elastic_profile_uid',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        attributes: existingAttributes,
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
      expect(res).toEqual({
        id: 'rule-id-get-1',
        ...existingAttributes,
      });
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

      const existingAttributes: RuleSavedObjectAttributes = {
        ...baseCreateData,
        enabled: true,
        createdBy: 'elastic_profile_uid',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'elastic_profile_uid',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        attributes: existingAttributes,
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
        attributes: {
          ...baseCreateData,
          name: 'rule-1',
          enabled: true,
          createdBy: 'elastic_profile_uid',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedBy: 'elastic_profile_uid',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
      };
      const so2 = {
        id: 'rule-2',
        type: RULE_SAVED_OBJECT_TYPE,
        references: [],
        score: 0,
        attributes: {
          ...baseCreateData,
          name: 'rule-2',
          enabled: false,
          createdBy: 'elastic_profile_uid',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedBy: 'elastic_profile_uid',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
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

      expect(res).toEqual({
        items: [
          { id: 'rule-1', ...so1.attributes },
          { id: 'rule-2', ...so2.attributes },
        ],
        total: 2,
        page: 2,
        perPage: 50,
      });
    });
  });
});
