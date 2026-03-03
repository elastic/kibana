/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of, Subject } from 'rxjs';
import { loggingSystemMock, coreMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import type { CoreSetup, CoreStart } from '@kbn/core/server';
import type { UiamConvertResponse } from './generate_uiam_keys_for_rules';
import {
  UiamApiKeyProvisioningTask,
  API_KEY_PROVISIONING_TASK_ID,
  API_KEY_PROVISIONING_TASK_TYPE,
  PROVISION_UIAM_API_KEYS_FLAG,
  TAGS,
} from './uiam_api_key_provisioning_task';
import { emptyState } from './uiam_api_key_provisioning_task_state';
import { RULE_SAVED_OBJECT_TYPE } from '../saved_objects';
import {
  UiamApiKeyProvisioningEntityType,
  UiamApiKeyProvisioningStatus,
} from '../saved_objects/schemas/raw_uiam_api_keys_provisioning_status';
import type { AlertingPluginsStart } from '../plugin';

jest.mock('./lib/get_exclude_rules_filter', () => ({
  getExcludeRulesFilter: jest.fn().mockResolvedValue(undefined),
}));

function createMockCore(uiamConvert: jest.Mock): {
  coreSetup: CoreSetup;
  coreStart: CoreStart;
  savedObjectsClient: ReturnType<typeof savedObjectsRepositoryMock.create>;
} {
  const coreSetup = coreMock.createSetup();
  const coreStart = coreMock.createStart();
  const savedObjectsClient = savedObjectsRepositoryMock.create();

  coreSetup.getStartServices = jest.fn().mockResolvedValue([coreStart]);

  coreStart.savedObjects.createInternalRepository = jest.fn().mockReturnValue(savedObjectsClient);

  const uiam = coreStart.security?.authc?.apiKeys?.uiam;
  if (uiam && typeof uiam === 'object') {
    (uiam as { convert?: jest.Mock }).convert = uiamConvert;
  }

  return { coreSetup, coreStart, savedObjectsClient };
}

function createRuleSavedObject(overrides: {
  id: string;
  attributes: { apiKey?: string; apiKeyCreatedByUser?: boolean };
}) {
  return {
    id: overrides.id,
    type: RULE_SAVED_OBJECT_TYPE,
    attributes: overrides.attributes,
    score: 1,
    references: [],
  };
}

function createTaskInstance(state: { runs: number } = emptyState) {
  return {
    id: API_KEY_PROVISIONING_TASK_ID,
    taskType: API_KEY_PROVISIONING_TASK_TYPE,
    params: {},
    state,
    scheduledAt: new Date(),
    startedAt: null,
    retryAt: null,
    runAt: new Date(),
    attempts: 0,
    status: 'idle' as const,
    ownerId: null,
    traceparent: '',
  };
}

describe('UiamApiKeyProvisioningTask', () => {
  const logger = loggingSystemMock.createLogger();

  describe('register', () => {
    it('registers task definition when serverless', () => {
      const task = new UiamApiKeyProvisioningTask({ logger, isServerless: true });
      const taskManager = { registerTaskDefinitions: jest.fn() };
      task.register({
        core: coreMock.createSetup() as CoreSetup<AlertingPluginsStart>,
        taskManager: taskManager as never,
      });
      expect(taskManager.registerTaskDefinitions).toHaveBeenCalledWith(
        expect.objectContaining({
          [API_KEY_PROVISIONING_TASK_TYPE]: expect.objectContaining({
            title: 'UIAM API key provisioning task',
            timeout: '5m',
            createTaskRunner: expect.any(Function),
          }),
        })
      );
    });
  });

  describe('start', () => {
    it('does not subscribe or schedule when not serverless', async () => {
      const core = coreMock.createStart();
      const ensureScheduled = jest.fn();
      const removeIfExists = jest.fn();
      const taskManager = { ensureScheduled, removeIfExists } as never;

      const task = new UiamApiKeyProvisioningTask({ logger, isServerless: false });
      await task.start({ core, taskManager });

      expect(ensureScheduled).not.toHaveBeenCalled();
      expect(core.featureFlags.getBooleanValue$).not.toHaveBeenCalled();
    });

    it('logs error and returns when taskManager is missing and serverless', async () => {
      const core = coreMock.createStart();

      const task = new UiamApiKeyProvisioningTask({ logger, isServerless: true });
      await task.start({ core, taskManager: undefined as never });

      expect(logger.error).toHaveBeenCalledWith(
        `Missing required task manager service during start of ${API_KEY_PROVISIONING_TASK_TYPE}`,
        { tags: TAGS }
      );
      expect(core.featureFlags.getBooleanValue$).not.toHaveBeenCalled();
    });

    it('calls ensureScheduled and logs info when flag emits true', async () => {
      const core = coreMock.createStart();
      core.featureFlags.getBooleanValue$ = jest.fn().mockReturnValue(of(true));
      const ensureScheduled = jest.fn().mockResolvedValue(undefined);
      const removeIfExists = jest.fn();
      const taskManager = { ensureScheduled, removeIfExists } as never;

      const task = new UiamApiKeyProvisioningTask({ logger, isServerless: true });
      await task.start({ core, taskManager });

      await new Promise<void>((resolve) => setImmediate(resolve));

      expect(core.featureFlags.getBooleanValue$).toHaveBeenCalledWith(
        PROVISION_UIAM_API_KEYS_FLAG,
        false
      );
      expect(ensureScheduled).toHaveBeenCalledWith({
        id: API_KEY_PROVISIONING_TASK_ID,
        taskType: API_KEY_PROVISIONING_TASK_TYPE,
        schedule: { interval: '1m' },
        state: emptyState,
        params: {},
      });
      expect(logger.info).toHaveBeenCalledWith(
        `${PROVISION_UIAM_API_KEYS_FLAG} enabled - Task ${API_KEY_PROVISIONING_TASK_TYPE} scheduled`,
        { tags: TAGS }
      );
      expect(removeIfExists).not.toHaveBeenCalled();
    });

    it('calls removeIfExists and logs info when flag emits false after true', async () => {
      const flag$ = new Subject<boolean>();
      const core = coreMock.createStart();
      core.featureFlags.getBooleanValue$ = jest.fn().mockReturnValue(flag$);
      const ensureScheduled = jest.fn().mockResolvedValue(undefined);
      const removeIfExists = jest.fn().mockResolvedValue(undefined);
      const taskManager = { ensureScheduled, removeIfExists } as never;

      const task = new UiamApiKeyProvisioningTask({ logger, isServerless: true });
      await task.start({ core, taskManager });

      flag$.next(true);
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(ensureScheduled).toHaveBeenCalledTimes(1);
      expect(removeIfExists).not.toHaveBeenCalled();

      flag$.next(false);
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(removeIfExists).toHaveBeenCalledWith(API_KEY_PROVISIONING_TASK_ID);
      expect(logger.info).toHaveBeenCalledWith(
        `${PROVISION_UIAM_API_KEYS_FLAG} disabled - Task ${API_KEY_PROVISIONING_TASK_TYPE} removed`,
        { tags: TAGS }
      );
    });

    it('logs error when ensureScheduled rejects', async () => {
      const core = coreMock.createStart();
      core.featureFlags.getBooleanValue$ = jest.fn().mockReturnValue(of(true));
      const ensureScheduled = jest.fn().mockRejectedValue(new Error('schedule failed'));
      const taskManager = { ensureScheduled, removeIfExists: jest.fn() } as never;

      const task = new UiamApiKeyProvisioningTask({ logger, isServerless: true });
      await task.start({ core, taskManager });

      await new Promise<void>((resolve) => setImmediate(resolve));

      expect(logger.error).toHaveBeenCalledWith(
        `Error scheduling task ${API_KEY_PROVISIONING_TASK_TYPE}, received schedule failed`,
        { tags: TAGS }
      );
    });

    it('logs error when removeIfExists rejects', async () => {
      const flag$ = new Subject<boolean>();
      const core = coreMock.createStart();
      core.featureFlags.getBooleanValue$ = jest.fn().mockReturnValue(flag$);
      const ensureScheduled = jest.fn().mockResolvedValue(undefined);
      const removeIfExists = jest.fn().mockRejectedValue(new Error('remove failed'));
      const taskManager = { ensureScheduled, removeIfExists } as never;

      const task = new UiamApiKeyProvisioningTask({ logger, isServerless: true });
      await task.start({ core, taskManager });

      flag$.next(true);
      await new Promise<void>((resolve) => setImmediate(resolve));

      flag$.next(false);
      await new Promise<void>((resolve) => setImmediate(resolve));

      expect(logger.error).toHaveBeenCalledWith(
        `Error removing task ${API_KEY_PROVISIONING_TASK_TYPE}, received remove failed`,
        { tags: TAGS }
      );
    });
  });

  describe('runTask', () => {
    it('increments state.runs and returns no runAt when no rules to process', async () => {
      const uiamConvert = jest.fn().mockResolvedValueOnce({ results: [] });
      const { coreSetup, savedObjectsClient } = createMockCore(uiamConvert);

      savedObjectsClient.find.mockResolvedValue({
        total: 0,
        per_page: 500,
        page: 1,
        saved_objects: [],
      });

      const task = new UiamApiKeyProvisioningTask({ logger, isServerless: true });
      const taskManager = { registerTaskDefinitions: jest.fn() };
      task.register({
        core: coreSetup as CoreSetup<AlertingPluginsStart>,
        taskManager: taskManager as never,
      });

      const def =
        taskManager.registerTaskDefinitions.mock.calls[0][0][API_KEY_PROVISIONING_TASK_TYPE];
      const runner = def.createTaskRunner({
        taskInstance: createTaskInstance({ runs: 5 }),
      });
      const result = await runner.run();

      expect(result).toEqual({ state: { runs: 6 } });
      expect(uiamConvert).not.toHaveBeenCalled();
      expect(savedObjectsClient.bulkUpdate).not.toHaveBeenCalled();
      expect(savedObjectsClient.bulkCreate).not.toHaveBeenCalled();
    });

    it('calls uiam.convert with rule apiKeys and updates rules when convert succeeds', async () => {
      const uiamConvert = jest.fn().mockResolvedValue({
        results: [
          {
            status: 'success' as const,
            id: 'essu_0',
            key: 'uiam-key-1',
            organization_id: '',
            description: '',
            internal: true,
            role_assignments: {},
            creation_date: new Date().toISOString(),
          },
        ],
      } as UiamConvertResponse);

      const { coreSetup, savedObjectsClient } = createMockCore(uiamConvert);

      savedObjectsClient.find.mockResolvedValue({
        total: 1,
        per_page: 500,
        page: 1,
        saved_objects: [
          createRuleSavedObject({
            id: 'rule-1',
            attributes: { apiKey: 'es-api-key-1', apiKeyCreatedByUser: false },
          }),
        ],
      });

      savedObjectsClient.bulkUpdate.mockResolvedValue({
        saved_objects: [
          {
            id: 'rule-1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: {},
            references: [],
            version: '1',
            error: undefined,
          },
        ],
      });

      const task = new UiamApiKeyProvisioningTask({ logger, isServerless: true });
      const taskManager = { registerTaskDefinitions: jest.fn() };
      task.register({
        core: coreSetup as CoreSetup<AlertingPluginsStart>,
        taskManager: taskManager as never,
      });

      const def =
        taskManager.registerTaskDefinitions.mock.calls[0][0][API_KEY_PROVISIONING_TASK_TYPE];
      const runner = def.createTaskRunner({
        taskInstance: createTaskInstance({ runs: 0 }),
      });
      const result = await runner.run();

      expect(result).toEqual({ state: { runs: 1 } });
      expect(uiamConvert).toHaveBeenCalledTimes(1);
      expect(uiamConvert).toHaveBeenCalledWith({
        keys: [{ key: 'es-api-key-1', type: 'elasticsearch' }],
      });
      expect(savedObjectsClient.bulkUpdate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: RULE_SAVED_OBJECT_TYPE,
            id: 'rule-1',
            attributes: { uiamApiKey: 'uiam-key-1' },
          }),
        ])
      );
      expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'uiam_api_keys_provisioning_status',
            id: 'rule-1',
            attributes: expect.objectContaining({
              entityId: 'rule-1',
              entityType: UiamApiKeyProvisioningEntityType.RULE,
              status: UiamApiKeyProvisioningStatus.COMPLETED,
            }),
          }),
        ]),
        { overwrite: true }
      );
    });

    it('records provisioning status for failed conversions and does not update rule', async () => {
      const uiamConvert = jest.fn().mockResolvedValue({
        results: [
          {
            status: 'failed' as const,
            message: 'Conversion failed',
            type: 'err',
            resource: '',
            code: '500',
          },
        ],
      } as UiamConvertResponse);

      const { coreSetup, savedObjectsClient } = createMockCore(uiamConvert);

      savedObjectsClient.find.mockResolvedValue({
        total: 1,
        per_page: 500,
        page: 1,
        saved_objects: [
          createRuleSavedObject({
            id: 'rule-2',
            attributes: { apiKey: 'es-api-key-2', apiKeyCreatedByUser: false },
          }),
        ],
      });

      const task = new UiamApiKeyProvisioningTask({ logger, isServerless: true });
      const taskManager = { registerTaskDefinitions: jest.fn() };
      task.register({
        core: coreSetup as CoreSetup<AlertingPluginsStart>,
        taskManager: taskManager as never,
      });

      const def =
        taskManager.registerTaskDefinitions.mock.calls[0][0][API_KEY_PROVISIONING_TASK_TYPE];
      const runner = def.createTaskRunner({
        taskInstance: createTaskInstance({ runs: 0 }),
      });
      const result = await runner.run();

      expect(result).toEqual({ state: { runs: 1 } });
      expect(uiamConvert).toHaveBeenCalledWith({
        keys: [{ key: 'es-api-key-2', type: 'elasticsearch' }],
      });
      expect(savedObjectsClient.bulkUpdate).not.toHaveBeenCalled();
      expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'uiam_api_keys_provisioning_status',
            id: 'rule-2',
            attributes: expect.objectContaining({
              entityId: 'rule-2',
              entityType: UiamApiKeyProvisioningEntityType.RULE,
              status: UiamApiKeyProvisioningStatus.FAILED,
              message: expect.stringContaining('Conversion failed'),
            }),
          }),
        ]),
        { overwrite: true }
      );
    });

    it('skips rules with no apiKey and writes SKIPPED status', async () => {
      const uiamConvert = jest.fn();
      const { coreSetup, savedObjectsClient } = createMockCore(uiamConvert);

      savedObjectsClient.find.mockResolvedValue({
        total: 1,
        per_page: 500,
        page: 1,
        saved_objects: [
          createRuleSavedObject({
            id: 'rule-no-key',
            attributes: { apiKey: undefined, apiKeyCreatedByUser: false },
          }),
        ],
      });

      const task = new UiamApiKeyProvisioningTask({ logger, isServerless: true });
      const taskManager = { registerTaskDefinitions: jest.fn() };
      task.register({
        core: coreSetup as CoreSetup<AlertingPluginsStart>,
        taskManager: taskManager as never,
      });

      const def =
        taskManager.registerTaskDefinitions.mock.calls[0][0][API_KEY_PROVISIONING_TASK_TYPE];
      const runner = def.createTaskRunner({
        taskInstance: createTaskInstance({ runs: 0 }),
      });
      const result = await runner.run();

      expect(result).toEqual({ state: { runs: 1 } });
      expect(uiamConvert).not.toHaveBeenCalled();
      expect(savedObjectsClient.bulkUpdate).not.toHaveBeenCalled();
      expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'rule-no-key',
            attributes: expect.objectContaining({
              status: UiamApiKeyProvisioningStatus.SKIPPED,
              message: 'The rule has no API key',
            }),
          }),
        ]),
        { overwrite: true }
      );
    });

    it('skips rules with apiKeyCreatedByUser true and writes SKIPPED status', async () => {
      const uiamConvert = jest.fn();
      const { coreSetup, savedObjectsClient } = createMockCore(uiamConvert);

      savedObjectsClient.find.mockResolvedValue({
        total: 1,
        per_page: 500,
        page: 1,
        saved_objects: [
          createRuleSavedObject({
            id: 'rule-user-key',
            attributes: { apiKey: 'user-es-key', apiKeyCreatedByUser: true },
          }),
        ],
      });

      const task = new UiamApiKeyProvisioningTask({ logger, isServerless: true });
      const taskManager = { registerTaskDefinitions: jest.fn() };
      task.register({
        core: coreSetup as CoreSetup<AlertingPluginsStart>,
        taskManager: taskManager as never,
      });

      const def =
        taskManager.registerTaskDefinitions.mock.calls[0][0][API_KEY_PROVISIONING_TASK_TYPE];
      const runner = def.createTaskRunner({
        taskInstance: createTaskInstance({ runs: 0 }),
      });
      const result = await runner.run();

      expect(result).toEqual({ state: { runs: 1 } });
      expect(uiamConvert).not.toHaveBeenCalled();
      expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'rule-user-key',
            attributes: expect.objectContaining({
              status: UiamApiKeyProvisioningStatus.SKIPPED,
              message: 'The API key was created by the user',
            }),
          }),
        ]),
        { overwrite: true }
      );
    });

    it('returns runAt when hasMoreToUpdate is true', async () => {
      const uiamConvert = jest.fn().mockResolvedValue({
        results: [
          {
            status: 'success' as const,
            id: 'essu_0',
            key: 'uiam-1',
            organization_id: '',
            description: '',
            internal: true,
            role_assignments: {},
            creation_date: new Date().toISOString(),
          },
        ],
      } as UiamConvertResponse);

      const { coreSetup, savedObjectsClient } = createMockCore(uiamConvert);

      savedObjectsClient.find.mockResolvedValue({
        total: 600,
        per_page: 500,
        page: 1,
        saved_objects: [
          createRuleSavedObject({
            id: 'rule-1',
            attributes: { apiKey: 'es-1', apiKeyCreatedByUser: false },
          }),
        ],
      });

      savedObjectsClient.bulkUpdate.mockResolvedValue({
        saved_objects: [
          {
            id: 'rule-1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: {},
            references: [],
            version: '1',
            error: undefined,
          },
        ],
      });

      const task = new UiamApiKeyProvisioningTask({ logger, isServerless: true });
      const taskManager = { registerTaskDefinitions: jest.fn() };
      task.register({
        core: coreSetup as CoreSetup<AlertingPluginsStart>,
        taskManager: taskManager as never,
      });

      const def =
        taskManager.registerTaskDefinitions.mock.calls[0][0][API_KEY_PROVISIONING_TASK_TYPE];
      const runner = def.createTaskRunner({
        taskInstance: createTaskInstance({ runs: 0 }),
      });
      const result = await runner.run();

      expect(result.state).toEqual({ runs: 1 });
      expect((result as { runAt?: Date }).runAt).toBeDefined();
      expect((result as { runAt?: Date }).runAt!.getTime()).toBeGreaterThan(Date.now());
    });

    it('throws when uiam.convert throws', async () => {
      const uiamConvert = jest.fn().mockRejectedValue(new Error('UIAM unavailable'));
      const { coreSetup, savedObjectsClient } = createMockCore(uiamConvert);

      savedObjectsClient.find.mockResolvedValue({
        total: 1,
        per_page: 500,
        page: 1,
        saved_objects: [
          createRuleSavedObject({
            id: 'rule-1',
            attributes: { apiKey: 'es-1', apiKeyCreatedByUser: false },
          }),
        ],
      });

      const task = new UiamApiKeyProvisioningTask({ logger, isServerless: true });
      const taskManager = { registerTaskDefinitions: jest.fn() };
      task.register({
        core: coreSetup as CoreSetup<AlertingPluginsStart>,
        taskManager: taskManager as never,
      });

      const def =
        taskManager.registerTaskDefinitions.mock.calls[0][0][API_KEY_PROVISIONING_TASK_TYPE];
      const runner = def.createTaskRunner({
        taskInstance: createTaskInstance({ runs: 0 }),
      });

      await expect(runner.run()).rejects.toThrow('UIAM unavailable');
      expect(logger.error).toHaveBeenCalledWith(
        'Error converting API keys: UIAM unavailable',
        expect.any(Object)
      );
    });

    it('throws when savedObjectsClient.find throws', async () => {
      const uiamConvert = jest.fn();
      const { coreSetup, savedObjectsClient } = createMockCore(uiamConvert);

      savedObjectsClient.find.mockRejectedValue(new Error('SO find failed'));

      const task = new UiamApiKeyProvisioningTask({ logger, isServerless: true });
      const taskManager = { registerTaskDefinitions: jest.fn() };
      task.register({
        core: coreSetup as CoreSetup<AlertingPluginsStart>,
        taskManager: taskManager as never,
      });

      const def =
        taskManager.registerTaskDefinitions.mock.calls[0][0][API_KEY_PROVISIONING_TASK_TYPE];
      const runner = def.createTaskRunner({
        taskInstance: createTaskInstance({ runs: 0 }),
      });

      await expect(runner.run()).rejects.toThrow('SO find failed');
      expect(logger.error).toHaveBeenCalledWith(
        'Error getting API keys to convert: SO find failed',
        expect.any(Object)
      );
      expect(uiamConvert).not.toHaveBeenCalled();
      expect(savedObjectsClient.bulkUpdate).not.toHaveBeenCalled();
      expect(savedObjectsClient.bulkCreate).not.toHaveBeenCalled();
    });

    it('throws when savedObjectsClient.bulkUpdate throws', async () => {
      const uiamConvert = jest.fn().mockResolvedValue({
        results: [
          {
            status: 'success' as const,
            id: 'essu_0',
            key: 'uiam-key-1',
            organization_id: '',
            description: '',
            internal: true,
            role_assignments: {},
            creation_date: new Date().toISOString(),
          },
        ],
      } as UiamConvertResponse);

      const { coreSetup, savedObjectsClient } = createMockCore(uiamConvert);

      savedObjectsClient.find.mockResolvedValue({
        total: 1,
        per_page: 500,
        page: 1,
        saved_objects: [
          createRuleSavedObject({
            id: 'rule-1',
            attributes: { apiKey: 'es-api-key-1', apiKeyCreatedByUser: false },
          }),
        ],
      });

      savedObjectsClient.bulkUpdate.mockRejectedValue(new Error('bulkUpdate failed'));

      const task = new UiamApiKeyProvisioningTask({ logger, isServerless: true });
      const taskManager = { registerTaskDefinitions: jest.fn() };
      task.register({
        core: coreSetup as CoreSetup<AlertingPluginsStart>,
        taskManager: taskManager as never,
      });

      const def =
        taskManager.registerTaskDefinitions.mock.calls[0][0][API_KEY_PROVISIONING_TASK_TYPE];
      const runner = def.createTaskRunner({
        taskInstance: createTaskInstance({ runs: 0 }),
      });

      await expect(runner.run()).rejects.toThrow('bulkUpdate failed');
      expect(logger.error).toHaveBeenCalledWith(
        'Error bulk updating rules with UIAM API keys: bulkUpdate failed',
        expect.any(Object)
      );
      expect(uiamConvert).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.bulkCreate).not.toHaveBeenCalled();
    });

    it('handles mixed success and failed convert results', async () => {
      const uiamConvert = jest.fn().mockResolvedValue({
        results: [
          {
            status: 'success' as const,
            id: 'essu_0',
            key: 'uiam-a',
            organization_id: '',
            description: '',
            internal: true,
            role_assignments: {},
            creation_date: new Date().toISOString(),
          },
          { status: 'failed' as const, message: 'Bad key', type: 'err', resource: '', code: '400' },
        ],
      } as UiamConvertResponse);

      const { coreSetup, savedObjectsClient } = createMockCore(uiamConvert);

      savedObjectsClient.find.mockResolvedValue({
        total: 2,
        per_page: 500,
        page: 1,
        saved_objects: [
          createRuleSavedObject({
            id: 'r1',
            attributes: { apiKey: 'es-a', apiKeyCreatedByUser: false },
          }),
          createRuleSavedObject({
            id: 'r2',
            attributes: { apiKey: 'es-b', apiKeyCreatedByUser: false },
          }),
        ],
      });

      savedObjectsClient.bulkUpdate.mockResolvedValue({
        saved_objects: [
          {
            id: 'r1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: {},
            references: [],
            version: '1',
            error: undefined,
          },
        ],
      });

      const task = new UiamApiKeyProvisioningTask({ logger, isServerless: true });
      const taskManager = { registerTaskDefinitions: jest.fn() };
      task.register({
        core: coreSetup as CoreSetup<AlertingPluginsStart>,
        taskManager: taskManager as never,
      });

      const def =
        taskManager.registerTaskDefinitions.mock.calls[0][0][API_KEY_PROVISIONING_TASK_TYPE];
      const runner = def.createTaskRunner({
        taskInstance: createTaskInstance({ runs: 0 }),
      });
      const result = await runner.run();

      expect(result).toEqual({ state: { runs: 1 } });
      expect(uiamConvert).toHaveBeenCalledWith({
        keys: [
          { key: 'es-a', type: 'elasticsearch' },
          { key: 'es-b', type: 'elasticsearch' },
        ],
      });
      expect(savedObjectsClient.bulkUpdate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'r1', attributes: { uiamApiKey: 'uiam-a' } }),
        ])
      );
      const bulkCreateCalls = savedObjectsClient.bulkCreate.mock.calls[0][0] as Array<{
        id: string;
        attributes: { status: string };
      }>;
      const statuses = bulkCreateCalls.map((c) => ({ id: c.id, status: c.attributes.status }));
      expect(statuses).toContainEqual({ id: 'r1', status: UiamApiKeyProvisioningStatus.COMPLETED });
      expect(statuses).toContainEqual({ id: 'r2', status: UiamApiKeyProvisioningStatus.FAILED });
    });
  });
});
