/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { AuthenticatedUser } from '@kbn/core/server';
import { mockAuthenticatedUser } from '@kbn/core-security-common/mocks';

import { RULE_SAVED_OBJECT_TYPE, type RuleSavedObjectAttributes } from '../../saved_objects';
import { RulesClient } from './rules_client';
import { createMockRulesSavedObjectService } from '../services/rules_saved_object_service/rules_saved_object_service.mock';

import type { CreateRuleParams, UpdateRuleData } from './types';

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
  const security = securityMock.createStart();
  const rulesSavedObjectService = createMockRulesSavedObjectService();

  const baseCreateData: CreateRuleParams['data'] = {
    name: 'rule-1',
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

    const user: AuthenticatedUser = mockAuthenticatedUser({
      username: 'elastic',
      profile_uid: 'elastic_profile_uid',
    });
    security.authc.getCurrentUser.mockReturnValue(user);

    rulesSavedObjectService.create.mockResolvedValue('rule-id-default');
    rulesSavedObjectService.update.mockResolvedValue();
    rulesSavedObjectService.delete.mockResolvedValue();
    rulesSavedObjectService.find.mockResolvedValue({
      saved_objects: [],
      total: 0,
    });

    ensureRuleExecutorTaskScheduledMock.mockResolvedValue({ id: 'task-123' });
    getRuleExecutorTaskIdMock.mockReturnValue('task:fallback');
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  function createClient() {
    return new RulesClient(request, http, rulesSavedObjectService, taskManager, security);
  }

  describe('createRule', () => {
    it('creates a rule SO and does not schedule a task when disabled', async () => {
      const client = createClient();
      rulesSavedObjectService.create.mockResolvedValueOnce('rule-id-1');

      const res = await client.createRule({
        data: { ...baseCreateData, enabled: false },
        options: { id: 'rule-id-1' },
      });

      expect(rulesSavedObjectService.create).toHaveBeenCalledWith({
        attrs: expect.objectContaining({
          name: 'rule-1',
          enabled: false,
          createdBy: 'elastic',
        }),
        id: 'rule-id-1',
      });

      expect(ensureRuleExecutorTaskScheduledMock).not.toHaveBeenCalled();
      expect(rulesSavedObjectService.update).not.toHaveBeenCalled();

      expect(res).toEqual(
        expect.objectContaining({
          id: 'rule-id-1',
          enabled: false,
          createdBy: 'elastic',
          updatedBy: 'elastic',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        })
      );
    });

    it('schedules a task when enabled', async () => {
      const client = createClient();
      rulesSavedObjectService.create.mockResolvedValueOnce('rule-id-2');

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
      expect(rulesSavedObjectService.update).not.toHaveBeenCalled();
      expect(res).toEqual(
        expect.objectContaining({
          id: 'rule-id-2',
          enabled: true,
        })
      );
    });

    it('cleans up the saved object if scheduling fails', async () => {
      const client = createClient();
      rulesSavedObjectService.create.mockResolvedValueOnce('rule-id-3');
      ensureRuleExecutorTaskScheduledMock.mockRejectedValueOnce(new Error('schedule failed'));

      await expect(
        client.createRule({
          data: { ...baseCreateData, enabled: true },
          options: { id: 'rule-id-3' },
        })
      ).rejects.toThrow('schedule failed');

      expect(rulesSavedObjectService.delete).toHaveBeenCalledWith({ id: 'rule-id-3' });
    });

    it('throws 409 conflict when id already exists', async () => {
      const client = createClient();
      rulesSavedObjectService.create.mockRejectedValueOnce(
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
      rulesSavedObjectService.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError(RULE_SAVED_OBJECT_TYPE, 'rule-id-1')
      );

      await expect(
        client.updateRule({ id: 'rule-id-1', data: {} as UpdateRuleData })
      ).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
    });

    it('disables a rule by removing task', async () => {
      const client = createClient();

      const existingAttributes: RuleSavedObjectAttributes = {
        ...baseCreateData,
        enabled: true,
        createdBy: 'elastic',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'elastic',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      rulesSavedObjectService.get.mockResolvedValueOnce({
        attributes: existingAttributes,
        version: 'WzEsMV0=',
        id: 'rule-id-1',
      });

      await client.updateRule({
        id: 'rule-id-1',
        data: { enabled: false } as UpdateRuleData,
      });

      expect(getRuleExecutorTaskIdMock).toHaveBeenCalledWith({
        ruleId: 'rule-id-1',
        spaceId: 'space-1',
      });
      expect(taskManager.removeIfExists).toHaveBeenCalledWith('task:fallback');
      expect(rulesSavedObjectService.update).toHaveBeenCalledWith({
        id: 'rule-id-1',
        attrs: expect.objectContaining({ enabled: false }),
        version: 'WzEsMV0=',
      });
    });

    it('enables a rule by ensuring the task exists', async () => {
      const client = createClient();

      const existingAttributes: RuleSavedObjectAttributes = {
        ...baseCreateData,
        enabled: false,
        createdBy: 'elastic',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'elastic',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      rulesSavedObjectService.get.mockResolvedValueOnce({
        attributes: existingAttributes,
        version: 'WzEsMV0=',
        id: 'rule-id-2',
      });

      await client.updateRule({
        id: 'rule-id-2',
        data: { enabled: true } as UpdateRuleData,
      });

      expect(ensureRuleExecutorTaskScheduledMock).toHaveBeenCalled();
      expect(rulesSavedObjectService.update).toHaveBeenCalledWith({
        id: 'rule-id-2',
        attrs: expect.objectContaining({ enabled: true }),
        version: 'WzEsMV0=',
      });
    });

    it('throws 409 conflict when version is stale', async () => {
      const client = createClient();

      const existingAttributes: RuleSavedObjectAttributes = {
        ...baseCreateData,
        enabled: false,
        createdBy: 'elastic',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'elastic',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      rulesSavedObjectService.get.mockResolvedValueOnce({
        id: 'rule-id-4',
        attributes: existingAttributes,
        version: 'WzEsMV0=',
      });

      rulesSavedObjectService.update.mockRejectedValueOnce(
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

      const existingAttributes: RuleSavedObjectAttributes = {
        ...baseCreateData,
        enabled: true,
        createdBy: 'elastic',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'elastic',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      rulesSavedObjectService.get.mockResolvedValueOnce({
        attributes: existingAttributes,
        version: 'WzEsMV0=',
        id: 'rule-id-get-1',
      });

      const res = await client.getRule({ id: 'rule-id-get-1' });

      expect(rulesSavedObjectService.get).toHaveBeenCalledWith('rule-id-get-1');
      expect(res).toEqual({
        id: 'rule-id-get-1',
        ...existingAttributes,
      });
    });

    it('throws 404 when rule is not found', async () => {
      const client = createClient();
      rulesSavedObjectService.get.mockRejectedValueOnce(
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
        createdBy: 'elastic',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'elastic',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      rulesSavedObjectService.get.mockResolvedValueOnce({
        attributes: existingAttributes,
        version: 'WzEsMV0=',
        id: 'rule-id-del-1',
      });
      getRuleExecutorTaskIdMock.mockReturnValueOnce('task:delete');

      await client.deleteRule({ id: 'rule-id-del-1' });

      expect(getRuleExecutorTaskIdMock).toHaveBeenCalledWith({
        ruleId: 'rule-id-del-1',
        spaceId: 'space-1',
      });
      expect(taskManager.removeIfExists).toHaveBeenCalledWith('task:delete');
      expect(rulesSavedObjectService.delete).toHaveBeenCalledWith({ id: 'rule-id-del-1' });
    });

    it('throws 404 when rule is not found', async () => {
      const client = createClient();
      rulesSavedObjectService.get.mockRejectedValueOnce(
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
        attributes: {
          ...baseCreateData,
          name: 'rule-1',
          enabled: true,
          createdBy: 'elastic',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedBy: 'elastic',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
      };
      const so2 = {
        id: 'rule-2',
        attributes: {
          ...baseCreateData,
          name: 'rule-2',
          enabled: false,
          createdBy: 'elastic',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedBy: 'elastic',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
      };

      rulesSavedObjectService.find.mockResolvedValueOnce({
        saved_objects: [so1, so2],
        total: 2,
      });

      const res = await client.findRules({ page: 2, perPage: 50 });

      expect(rulesSavedObjectService.find).toHaveBeenCalledWith({ page: 2, perPage: 50 });

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
