/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { AuthenticatedUser, SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { mockAuthenticatedUser } from '@kbn/core-security-common/mocks';

import { RULE_SAVED_OBJECT_TYPE, type RuleSavedObjectAttributes } from '../../saved_objects';
import { RulesClient } from './rules_client';

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
  const savedObjects = savedObjectsServiceMock.createStartContract();
  const taskManager = taskManagerMock.createStart();
  const security = securityMock.createStart();

  const savedObjectsClient =
    savedObjectsClientMock.create() as unknown as jest.Mocked<SavedObjectsClientContract>;

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

    savedObjects.getScopedClient.mockReturnValue(savedObjectsClient);
    const user: AuthenticatedUser = mockAuthenticatedUser({
      username: 'elastic',
      profile_uid: 'elastic_profile_uid',
    });
    security.authc.getCurrentUser.mockReturnValue(user);

    // savedObjectsClientMock methods default to returning undefined; ensure promise APIs
    // used with .catch() behave like the real client.
    savedObjectsClient.delete.mockResolvedValue({});

    ensureRuleExecutorTaskScheduledMock.mockResolvedValue({ id: 'task-123' });
    getRuleExecutorTaskIdMock.mockReturnValue('task:fallback');
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  function createClient() {
    return new RulesClient(request, http, savedObjects, taskManager, security);
  }

  describe('createRule', () => {
    it('creates a rule SO and does not schedule a task when disabled', async () => {
      const client = createClient();

      const res = await client.createRule({
        data: { ...baseCreateData, enabled: false },
        options: { id: 'rule-id-1' },
      });

      expect(savedObjects.getScopedClient).toHaveBeenCalledWith(request, {
        includedHiddenTypes: [RULE_SAVED_OBJECT_TYPE],
      });
      expect(savedObjectsClient.create).toHaveBeenCalledWith(
        RULE_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          name: 'rule-1',
          enabled: false,
          createdBy: 'elastic',
        }),
        { id: 'rule-id-1', overwrite: false }
      );

      expect(ensureRuleExecutorTaskScheduledMock).not.toHaveBeenCalled();
      expect(savedObjectsClient.update).not.toHaveBeenCalled();

      expect(res).toEqual(
        expect.objectContaining({
          id: 'rule-id-1',
          enabled: false,
          scheduledTaskId: null,
          createdBy: 'elastic',
          updatedBy: 'elastic',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        })
      );
    });

    it('schedules a task when enabled and persists scheduledTaskId', async () => {
      const client = createClient();

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
      expect(savedObjectsClient.update).toHaveBeenCalledWith(RULE_SAVED_OBJECT_TYPE, 'rule-id-2', {
        scheduledTaskId: 'task-123',
      });
      expect(res.scheduledTaskId).toBe('task-123');
    });

    it('cleans up the saved object if scheduling fails', async () => {
      const client = createClient();
      ensureRuleExecutorTaskScheduledMock.mockRejectedValueOnce(new Error('schedule failed'));

      await expect(
        client.createRule({
          data: { ...baseCreateData, enabled: true },
          options: { id: 'rule-id-3' },
        })
      ).rejects.toThrow('schedule failed');

      expect(savedObjectsClient.delete).toHaveBeenCalledWith(RULE_SAVED_OBJECT_TYPE, 'rule-id-3');
    });

    it('throws 409 conflict when id already exists', async () => {
      const client = createClient();
      savedObjectsClient.create.mockRejectedValueOnce(
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
      savedObjectsClient.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError(RULE_SAVED_OBJECT_TYPE, 'rule-id-1')
      );

      await expect(
        client.updateRule({ id: 'rule-id-1', data: {} as UpdateRuleData })
      ).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
    });

    it('disables a rule by removing task and clearing scheduledTaskId', async () => {
      const client = createClient();

      const existing: SavedObject<RuleSavedObjectAttributes> = {
        id: 'rule-id-1',
        type: RULE_SAVED_OBJECT_TYPE,
        version: 'WzEsMV0=',
        attributes: {
          ...baseCreateData,
          enabled: true,
          scheduledTaskId: 'task-aaa',
          createdBy: 'elastic',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedBy: 'elastic',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
        references: [],
      };
      savedObjectsClient.get.mockResolvedValueOnce(existing);

      await client.updateRule({
        id: 'rule-id-1',
        data: { enabled: false } as UpdateRuleData,
      });

      expect(taskManager.removeIfExists).toHaveBeenCalledWith('task-aaa');
      expect(savedObjectsClient.update).toHaveBeenCalledWith(
        RULE_SAVED_OBJECT_TYPE,
        'rule-id-1',
        expect.objectContaining({ scheduledTaskId: null }),
        expect.any(Object)
      );
    });

    it('enables a rule by ensuring the task exists and updating scheduledTaskId', async () => {
      const client = createClient();

      const existing: SavedObject<RuleSavedObjectAttributes> = {
        id: 'rule-id-2',
        type: RULE_SAVED_OBJECT_TYPE,
        version: 'WzEsMV0=',
        attributes: {
          ...baseCreateData,
          enabled: false,
          scheduledTaskId: null,
          createdBy: 'elastic',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedBy: 'elastic',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
        references: [],
      };
      savedObjectsClient.get.mockResolvedValueOnce(existing);

      await client.updateRule({
        id: 'rule-id-2',
        data: { enabled: true } as UpdateRuleData,
      });

      expect(ensureRuleExecutorTaskScheduledMock).toHaveBeenCalled();
      expect(savedObjectsClient.update).toHaveBeenCalledWith(
        RULE_SAVED_OBJECT_TYPE,
        'rule-id-2',
        expect.objectContaining({ scheduledTaskId: 'task-123' }),
        expect.any(Object)
      );
    });

    it('uses fallback task id when scheduledTaskId is missing on disable', async () => {
      const client = createClient();

      const existing: SavedObject<RuleSavedObjectAttributes> = {
        id: 'rule-id-3',
        type: RULE_SAVED_OBJECT_TYPE,
        version: 'WzEsMV0=',
        attributes: {
          ...baseCreateData,
          enabled: true,
          scheduledTaskId: null,
          createdBy: 'elastic',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedBy: 'elastic',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
        references: [],
      };
      savedObjectsClient.get.mockResolvedValueOnce(existing);

      await client.updateRule({
        id: 'rule-id-3',
        data: { enabled: false } as UpdateRuleData,
      });

      expect(getRuleExecutorTaskIdMock).toHaveBeenCalledWith({
        ruleId: 'rule-id-3',
        spaceId: 'space-1',
      });
      expect(taskManager.removeIfExists).toHaveBeenCalledWith('task:fallback');
    });

    it('throws 409 conflict when version is stale', async () => {
      const client = createClient();

      const existing: SavedObject<RuleSavedObjectAttributes> = {
        id: 'rule-id-4',
        type: RULE_SAVED_OBJECT_TYPE,
        version: 'WzEsMV0=',
        attributes: {
          ...baseCreateData,
          enabled: false,
          scheduledTaskId: null,
          createdBy: 'elastic',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedBy: 'elastic',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
        references: [],
      };
      savedObjectsClient.get.mockResolvedValueOnce(existing);

      savedObjectsClient.update.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createConflictError(RULE_SAVED_OBJECT_TYPE, 'rule-id-4')
      );

      await expect(
        client.updateRule({ id: 'rule-id-4', data: {} as UpdateRuleData })
      ).rejects.toMatchObject({
        output: { statusCode: 409 },
      });
    });
  });
});
