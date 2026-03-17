/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of, Subject } from 'rxjs';
import { loggingSystemMock, coreMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import type { CoreSetup, CoreStart } from '@kbn/core/server';
import type { ConvertUiamAPIKeysResponse } from '@kbn/core-security-server';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { UiamApiKeyProvisioningTask } from './uiam_api_key_provisioning_task';
import {
  API_KEY_PROVISIONING_TASK_ID,
  API_KEY_PROVISIONING_TASK_TYPE,
  PROVISION_UIAM_API_KEYS_FLAG,
  TAGS,
  API_KEY_PROVISIONING_TASK_SCHEDULE,
  GET_RULES_BATCH_SIZE,
} from './constants';
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

jest.mock('../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation', () => ({
  bulkMarkApiKeysForInvalidation: jest.fn().mockResolvedValue(undefined),
}));

import { bulkMarkApiKeysForInvalidation } from '../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';

function createMockCore(uiamConvert: jest.Mock): {
  coreSetup: CoreSetup;
  coreStart: CoreStart;
  savedObjectsClient: ReturnType<typeof savedObjectsRepositoryMock.create>;
  encryptedSavedObjectsClient: ReturnType<typeof encryptedSavedObjectsMock.createClient>;
} {
  const coreSetup = coreMock.createSetup();
  const coreStart = coreMock.createStart();
  const savedObjectsClient = savedObjectsRepositoryMock.create();
  const encryptedSavedObjectsClient = encryptedSavedObjectsMock.createClient();

  const plugins = {
    encryptedSavedObjects: {
      getClient: jest.fn().mockReturnValue(encryptedSavedObjectsClient),
    },
  };
  coreSetup.getStartServices = jest.fn().mockResolvedValue([coreStart, plugins]);

  coreStart.savedObjects.getUnsafeInternalClient = jest.fn().mockReturnValue(savedObjectsClient);
  coreStart.savedObjects.createInternalRepository = jest.fn().mockReturnValue(savedObjectsClient);

  const uiam = coreStart.security?.authc?.apiKeys?.uiam as
    | { convert?: jest.Mock }
    | null
    | undefined;
  if (uiam && typeof uiam === 'object') {
    uiam.convert = uiamConvert;
  }

  return { coreSetup, coreStart, savedObjectsClient, encryptedSavedObjectsClient };
}

/** Set up the ESO PIT finder to yield the given saved_objects (rules) when find() is iterated */
function mockPitFinderRules(
  encryptedSavedObjectsClient: ReturnType<typeof encryptedSavedObjectsMock.createClient>,
  savedObjects: Array<{
    id: string;
    type: string;
    attributes: Record<string, unknown>;
    version?: string;
  }>,
  /** Total hit count; if greater than savedObjects.length, task will reschedule for more batches */
  total?: number
) {
  (
    encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser as jest.Mock
  ).mockResolvedValue({
    close: jest.fn(),
    async *find() {
      yield {
        saved_objects: savedObjects,
        total: total ?? savedObjects.length,
      };
    },
  });
}

function createRuleSavedObject(overrides: {
  id: string;
  attributes: { apiKey?: string; apiKeyCreatedByUser?: boolean; uiamApiKey?: string };
  version?: string;
}) {
  return {
    id: overrides.id,
    type: RULE_SAVED_OBJECT_TYPE,
    attributes: overrides.attributes,
    version: overrides.version,
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

/** Build a convert API success result matching core ConvertUiamAPIKeyResultSuccess */
function createConvertSuccessResult(overrides: {
  key: string;
  id?: string;
}): ConvertUiamAPIKeysResponse['results'][0] {
  return {
    status: 'success',
    id: overrides.id ?? 'essu_0',
    key: overrides.key,
    organization_id: '',
    description: '',
    internal: true,
    role_assignments: {},
    creation_date: new Date().toISOString(),
    expiration_date: null,
  };
}

/** Build a convert API failed result matching core ConvertUiamAPIKeyResultFailed */
function createConvertFailedResult(overrides: {
  message: string;
  code?: string;
}): ConvertUiamAPIKeysResponse['results'][0] {
  return {
    status: 'failed',
    message: overrides.message,
    type: 'err',
    resource: null,
    code: overrides.code ?? '500',
  };
}

describe('UiamApiKeyProvisioningTask', () => {
  const logger = loggingSystemMock.createLogger();

  describe('register', () => {
    it('does not register when not serverless', () => {
      const task = new UiamApiKeyProvisioningTask({ logger, isServerless: false });
      const taskManager = { registerTaskDefinitions: jest.fn() };
      task.register({
        core: coreMock.createSetup() as CoreSetup<AlertingPluginsStart>,
        taskManager: taskManager as never,
      });
      expect(taskManager.registerTaskDefinitions).not.toHaveBeenCalled();
    });

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
        schedule: API_KEY_PROVISIONING_TASK_SCHEDULE,
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

  describe('stop', () => {
    it('unsubscribes from the feature flag observable', async () => {
      const flag$ = new Subject<boolean>();
      const core = coreMock.createStart();
      core.featureFlags.getBooleanValue$ = jest.fn().mockReturnValue(flag$);
      const ensureScheduled = jest.fn().mockResolvedValue(undefined);
      const taskManager = { ensureScheduled, removeIfExists: jest.fn() } as never;

      const task = new UiamApiKeyProvisioningTask({ logger, isServerless: true });
      await task.start({ core, taskManager });

      task.stop();

      flag$.next(true);
      await new Promise<void>((resolve) => setImmediate(resolve));

      expect(ensureScheduled).not.toHaveBeenCalled();
    });

    it('is safe to call when start was never called', () => {
      const task = new UiamApiKeyProvisioningTask({ logger, isServerless: true });
      expect(() => task.stop()).not.toThrow();
    });

    it('is safe to call multiple times', async () => {
      const flag$ = new Subject<boolean>();
      const core = coreMock.createStart();
      core.featureFlags.getBooleanValue$ = jest.fn().mockReturnValue(flag$);
      const taskManager = {
        ensureScheduled: jest.fn().mockResolvedValue(undefined),
        removeIfExists: jest.fn(),
      } as never;

      const task = new UiamApiKeyProvisioningTask({ logger, isServerless: true });
      await task.start({ core, taskManager });

      expect(() => {
        task.stop();
        task.stop();
      }).not.toThrow();
    });
  });

  describe('runTask', () => {
    it('increments state.runs and returns no runAt when no rules to process', async () => {
      const uiamConvert = jest.fn().mockResolvedValueOnce({ results: [] });
      const { coreSetup, savedObjectsClient, encryptedSavedObjectsClient } =
        createMockCore(uiamConvert);

      mockPitFinderRules(encryptedSavedObjectsClient, []);

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

    it('returns runAt 1m from now when response.total indicates more batches to process', async () => {
      const batchSize = GET_RULES_BATCH_SIZE;
      const rules = Array.from({ length: batchSize }, (_, i) =>
        createRuleSavedObject({
          id: `rule-${i}`,
          attributes: { apiKey: `es-api-key-${i}`, apiKeyCreatedByUser: false },
          version: '1',
        })
      );
      const uiamConvert = jest.fn().mockResolvedValue({
        results: Array.from({ length: batchSize }, (_, i) =>
          createConvertSuccessResult({ key: `uiam-key-${i}`, id: `essu_${i}` })
        ),
      } as ConvertUiamAPIKeysResponse);

      const { coreSetup, savedObjectsClient, encryptedSavedObjectsClient } =
        createMockCore(uiamConvert);
      mockPitFinderRules(encryptedSavedObjectsClient, rules, batchSize + 1);

      savedObjectsClient.bulkUpdate.mockResolvedValue({
        saved_objects: rules.map((r) => ({
          id: r.id,
          type: RULE_SAVED_OBJECT_TYPE,
          attributes: {},
          references: [],
          version: r.version,
          error: undefined,
        })),
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
      const beforeRun = Date.now();
      const result = await runner.run();
      const afterRun = Date.now();

      expect(result).toHaveProperty('state', { runs: 1 });
      expect(result).toHaveProperty('runAt');
      const runAt = (result as { runAt?: Date }).runAt!;
      expect(runAt.getTime()).toBeGreaterThanOrEqual(beforeRun + 60000 - 1000);
      expect(runAt.getTime()).toBeLessThanOrEqual(afterRun + 60000 + 1000);
      expect(uiamConvert).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.bulkUpdate).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith(
        `Wrote provisioning status: ${batchSize} total (0 skipped, 0 failed conversions, ${batchSize} completed, 0 failed updates).`,
        { tags: TAGS }
      );
    });

    it('calls uiam.convert with rule apiKeys and updates rules when convert succeeds', async () => {
      const uiamConvert = jest.fn().mockResolvedValue({
        results: [
          createConvertSuccessResult({ key: 'uiam-key-1' }),
          createConvertSuccessResult({ key: 'uiam-key-2', id: 'essu_1' }),
          createConvertSuccessResult({ key: 'uiam-key-3', id: 'essu_2' }),
        ],
      } as ConvertUiamAPIKeysResponse);

      const { coreSetup, savedObjectsClient, encryptedSavedObjectsClient } =
        createMockCore(uiamConvert);

      const rules = [
        createRuleSavedObject({
          id: 'rule-1',
          attributes: { apiKey: 'es-api-key-1', apiKeyCreatedByUser: false },
          version: '1',
        }),
        createRuleSavedObject({
          id: 'rule-2',
          attributes: { apiKey: 'es-api-key-2', apiKeyCreatedByUser: false },
          version: '1',
        }),
        createRuleSavedObject({
          id: 'rule-3',
          attributes: { apiKey: 'es-api-key-3', apiKeyCreatedByUser: false },
          version: '1',
        }),
      ];
      mockPitFinderRules(encryptedSavedObjectsClient, rules);

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
          {
            id: 'rule-2',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: {},
            references: [],
            version: '1',
            error: undefined,
          },
          {
            id: 'rule-3',
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
      expect(uiamConvert).toHaveBeenCalledWith(['es-api-key-1', 'es-api-key-2', 'es-api-key-3']);
      // uiamApiKey is stored as base64(id:key) per task implementation
      expect(savedObjectsClient.bulkUpdate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: RULE_SAVED_OBJECT_TYPE,
            id: 'rule-1',
            attributes: expect.objectContaining({
              uiamApiKey: Buffer.from('essu_0:uiam-key-1').toString('base64'),
            }),
            version: '1',
            mergeAttributes: false,
          }),
          expect.objectContaining({
            type: RULE_SAVED_OBJECT_TYPE,
            id: 'rule-2',
            attributes: expect.objectContaining({
              uiamApiKey: Buffer.from('essu_1:uiam-key-2').toString('base64'),
            }),
            version: '1',
            mergeAttributes: false,
          }),
          expect.objectContaining({
            type: RULE_SAVED_OBJECT_TYPE,
            id: 'rule-3',
            attributes: expect.objectContaining({
              uiamApiKey: Buffer.from('essu_2:uiam-key-3').toString('base64'),
            }),
            version: '1',
            mergeAttributes: false,
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
          expect.objectContaining({
            type: 'uiam_api_keys_provisioning_status',
            id: 'rule-2',
            attributes: expect.objectContaining({
              entityId: 'rule-2',
              entityType: UiamApiKeyProvisioningEntityType.RULE,
              status: UiamApiKeyProvisioningStatus.COMPLETED,
            }),
          }),
          expect.objectContaining({
            type: 'uiam_api_keys_provisioning_status',
            id: 'rule-3',
            attributes: expect.objectContaining({
              entityId: 'rule-3',
              entityType: UiamApiKeyProvisioningEntityType.RULE,
              status: UiamApiKeyProvisioningStatus.COMPLETED,
            }),
          }),
        ]),
        { overwrite: true }
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Wrote provisioning status: 3 total (0 skipped, 0 failed conversions, 3 completed, 0 failed updates).',
        { tags: TAGS }
      );
    });

    it('records provisioning status for failed conversions and updates only rules that succeeded', async () => {
      const uiamConvert = jest.fn().mockResolvedValue({
        results: [
          createConvertSuccessResult({ key: 'uiam-key-2' }),
          createConvertFailedResult({ message: 'Conversion failed for rule-3' }),
          createConvertFailedResult({ message: 'Conversion failed for rule-4' }),
        ],
      } as ConvertUiamAPIKeysResponse);

      const { coreSetup, savedObjectsClient, encryptedSavedObjectsClient } =
        createMockCore(uiamConvert);

      mockPitFinderRules(encryptedSavedObjectsClient, [
        createRuleSavedObject({
          id: 'rule-2',
          attributes: { apiKey: 'es-api-key-2', apiKeyCreatedByUser: false },
          version: '1',
        }),
        createRuleSavedObject({
          id: 'rule-3',
          attributes: { apiKey: 'es-api-key-3', apiKeyCreatedByUser: false },
          version: '1',
        }),
        createRuleSavedObject({
          id: 'rule-4',
          attributes: { apiKey: 'es-api-key-4', apiKeyCreatedByUser: false },
          version: '1',
        }),
      ]);

      savedObjectsClient.bulkUpdate.mockResolvedValue({
        saved_objects: [
          {
            id: 'rule-2',
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
      expect(uiamConvert).toHaveBeenCalledWith(['es-api-key-2', 'es-api-key-3', 'es-api-key-4']);
      // uiamApiKey is stored as base64(id:key) per task implementation
      expect(savedObjectsClient.bulkUpdate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: RULE_SAVED_OBJECT_TYPE,
            id: 'rule-2',
            attributes: expect.objectContaining({
              uiamApiKey: Buffer.from('essu_0:uiam-key-2').toString('base64'),
            }),
            version: '1',
            mergeAttributes: false,
          }),
        ])
      );
      expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'uiam_api_keys_provisioning_status',
            id: 'rule-2',
            attributes: expect.objectContaining({
              entityId: 'rule-2',
              entityType: UiamApiKeyProvisioningEntityType.RULE,
              status: UiamApiKeyProvisioningStatus.COMPLETED,
            }),
          }),
          expect.objectContaining({
            type: 'uiam_api_keys_provisioning_status',
            id: 'rule-3',
            attributes: expect.objectContaining({
              entityId: 'rule-3',
              entityType: UiamApiKeyProvisioningEntityType.RULE,
              status: UiamApiKeyProvisioningStatus.FAILED,
              message: expect.stringContaining('Conversion failed for rule-3'),
            }),
          }),
          expect.objectContaining({
            type: 'uiam_api_keys_provisioning_status',
            id: 'rule-4',
            attributes: expect.objectContaining({
              entityId: 'rule-4',
              entityType: UiamApiKeyProvisioningEntityType.RULE,
              status: UiamApiKeyProvisioningStatus.FAILED,
              message: expect.stringContaining('Conversion failed for rule-4'),
            }),
          }),
        ]),
        { overwrite: true }
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Wrote provisioning status: 3 total (0 skipped, 2 failed conversions, 1 completed, 0 failed updates).',
        { tags: TAGS }
      );
    });

    it('skips rules with no apiKey and writes SKIPPED status', async () => {
      const uiamConvert = jest.fn();
      const { coreSetup, savedObjectsClient, encryptedSavedObjectsClient } =
        createMockCore(uiamConvert);

      mockPitFinderRules(encryptedSavedObjectsClient, [
        createRuleSavedObject({
          id: 'rule-no-key',
          attributes: { apiKey: undefined, apiKeyCreatedByUser: false },
        }),
      ]);

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
      expect(logger.info).toHaveBeenCalledWith(
        'Wrote provisioning status: 1 total (1 skipped, 0 failed conversions, 0 completed, 0 failed updates).',
        { tags: TAGS }
      );
    });

    it('skips rules with apiKeyCreatedByUser true and writes SKIPPED status', async () => {
      const uiamConvert = jest.fn();
      const { coreSetup, savedObjectsClient, encryptedSavedObjectsClient } =
        createMockCore(uiamConvert);

      mockPitFinderRules(encryptedSavedObjectsClient, [
        createRuleSavedObject({
          id: 'rule-user-key',
          attributes: { apiKey: 'user-es-key', apiKeyCreatedByUser: true },
        }),
      ]);

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
      expect(logger.info).toHaveBeenCalledWith(
        'Wrote provisioning status: 1 total (1 skipped, 0 failed conversions, 0 completed, 0 failed updates).',
        { tags: TAGS }
      );
    });

    it('skips rules that already have uiamApiKey and writes SKIPPED status', async () => {
      const uiamConvert = jest.fn();
      const { coreSetup, savedObjectsClient, encryptedSavedObjectsClient } =
        createMockCore(uiamConvert);

      mockPitFinderRules(encryptedSavedObjectsClient, [
        createRuleSavedObject({
          id: 'rule-has-uiam',
          attributes: {
            apiKey: 'es-key',
            apiKeyCreatedByUser: false,
            uiamApiKey: 'existing-uiam-key',
          },
        }),
      ]);

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
            id: 'rule-has-uiam',
            attributes: expect.objectContaining({
              status: UiamApiKeyProvisioningStatus.SKIPPED,
              message: 'The rule already has a UIAM API key',
            }),
          }),
        ]),
        { overwrite: true }
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Wrote provisioning status: 1 total (1 skipped, 0 failed conversions, 0 completed, 0 failed updates).',
        { tags: TAGS }
      );
    });

    it('processes one batch of rules and increments state', async () => {
      const uiamConvert = jest.fn().mockResolvedValue({
        results: [createConvertSuccessResult({ key: 'uiam-1' })],
      });

      const { coreSetup, savedObjectsClient, encryptedSavedObjectsClient } =
        createMockCore(uiamConvert);

      mockPitFinderRules(encryptedSavedObjectsClient, [
        createRuleSavedObject({
          id: 'rule-1',
          attributes: { apiKey: 'es-1', apiKeyCreatedByUser: false },
          version: '1',
        }),
      ]);

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
      expect(savedObjectsClient.bulkUpdate).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith(
        'Wrote provisioning status: 1 total (0 skipped, 0 failed conversions, 1 completed, 0 failed updates).',
        { tags: TAGS }
      );
    });

    it('throws when uiam.convert throws', async () => {
      const uiamConvert = jest.fn().mockRejectedValue(new Error('UIAM unavailable'));
      const { coreSetup, encryptedSavedObjectsClient } = createMockCore(uiamConvert);

      mockPitFinderRules(encryptedSavedObjectsClient, [
        createRuleSavedObject({
          id: 'rule-1',
          attributes: { apiKey: 'es-1', apiKeyCreatedByUser: false },
        }),
      ]);

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

    it('throws when uiam.convert is not available', async () => {
      const { coreSetup, coreStart, encryptedSavedObjectsClient } = createMockCore(jest.fn());
      const uiam = coreStart.security?.authc?.apiKeys?.uiam as unknown as
        | { convert?: jest.Mock }
        | undefined;
      if (uiam) uiam.convert = undefined;

      mockPitFinderRules(encryptedSavedObjectsClient, [
        createRuleSavedObject({
          id: 'rule-1',
          attributes: { apiKey: 'es-1', apiKeyCreatedByUser: false },
        }),
      ]);

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

      await expect(runner.run()).rejects.toThrow('UIAM convert API is not available');
      // Task fast-fails in runTask before convert; no convertApiKeys error logging
    });

    it('throws when uiam.convert returns null (license not enabled)', async () => {
      const uiamConvert = jest.fn().mockResolvedValue(null);
      const { coreSetup, encryptedSavedObjectsClient } = createMockCore(uiamConvert);

      mockPitFinderRules(encryptedSavedObjectsClient, [
        createRuleSavedObject({
          id: 'rule-1',
          attributes: { apiKey: 'es-1', apiKeyCreatedByUser: false },
        }),
      ]);

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

      await expect(runner.run()).rejects.toThrow(
        'License required for the UIAM convert API is not enabled'
      );
      expect(logger.error).toHaveBeenCalledWith(
        'Error converting API keys: License required for the UIAM convert API is not enabled',
        expect.any(Object)
      );
      expect(uiamConvert).toHaveBeenCalledWith(['es-1']);
    });

    it('throws when convert result count does not match input count', async () => {
      const uiamConvert = jest.fn().mockResolvedValue({
        results: [
          createConvertSuccessResult({ key: 'uiam-1' }),
          createConvertSuccessResult({ key: 'uiam-2' }),
        ],
      } as ConvertUiamAPIKeysResponse);

      const { coreSetup, savedObjectsClient, encryptedSavedObjectsClient } =
        createMockCore(uiamConvert);

      mockPitFinderRules(encryptedSavedObjectsClient, [
        createRuleSavedObject({
          id: 'rule-1',
          attributes: { apiKey: 'es-1', apiKeyCreatedByUser: false },
        }),
        createRuleSavedObject({
          id: 'rule-2',
          attributes: { apiKey: 'es-2', apiKeyCreatedByUser: false },
        }),
        createRuleSavedObject({
          id: 'rule-3',
          attributes: { apiKey: 'es-3', apiKeyCreatedByUser: false },
        }),
      ]);

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

      await expect(runner.run()).rejects.toThrow(
        'Number of converted API keys does not match the number of API keys to convert'
      );
      expect(logger.error).toHaveBeenCalledWith(
        'Error converting API keys: Number of converted API keys does not match the number of API keys to convert',
        expect.any(Object)
      );
      expect(savedObjectsClient.bulkUpdate).not.toHaveBeenCalled();
    });

    it('throws when createPointInTimeFinderDecryptedAsInternalUser throws', async () => {
      const uiamConvert = jest.fn();
      const { coreSetup, savedObjectsClient, encryptedSavedObjectsClient } =
        createMockCore(uiamConvert);

      (
        encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser as jest.Mock
      ).mockRejectedValue(new Error('PIT finder failed'));

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

      await expect(runner.run()).rejects.toThrow('PIT finder failed');
      expect(logger.error).toHaveBeenCalledWith(
        'Error getting API keys to convert: PIT finder failed',
        expect.any(Object)
      );
      expect(uiamConvert).not.toHaveBeenCalled();
      expect(savedObjectsClient.bulkUpdate).not.toHaveBeenCalled();
      expect(savedObjectsClient.bulkCreate).not.toHaveBeenCalled();
    });

    it('throws when savedObjectsClient.bulkUpdate throws', async () => {
      const uiamConvert = jest.fn().mockResolvedValue({
        results: [createConvertSuccessResult({ key: 'uiam-key-1' })],
      });

      const { coreSetup, savedObjectsClient, encryptedSavedObjectsClient } =
        createMockCore(uiamConvert);

      mockPitFinderRules(encryptedSavedObjectsClient, [
        createRuleSavedObject({
          id: 'rule-1',
          attributes: { apiKey: 'es-api-key-1', apiKeyCreatedByUser: false },
          version: '1',
        }),
      ]);

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
      const orphanedKey = Buffer.from('essu_0:uiam-key-1').toString('base64');
      expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledTimes(1);
      expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledWith(
        { apiKeys: [orphanedKey] },
        logger,
        savedObjectsClient
      );
    });

    it('calls bulkMarkApiKeysForInvalidation for rules that fail in bulkUpdate response', async () => {
      (bulkMarkApiKeysForInvalidation as jest.Mock).mockClear();
      const uiamConvert = jest.fn().mockResolvedValue({
        results: [
          createConvertSuccessResult({ key: 'uiam-a', id: 'essu_0' }),
          createConvertSuccessResult({ key: 'uiam-b', id: 'essu_1' }),
        ],
      } as ConvertUiamAPIKeysResponse);

      const { coreSetup, savedObjectsClient, encryptedSavedObjectsClient } =
        createMockCore(uiamConvert);

      mockPitFinderRules(encryptedSavedObjectsClient, [
        createRuleSavedObject({
          id: 'r1',
          attributes: { apiKey: 'es-a', apiKeyCreatedByUser: false },
          version: '1',
        }),
        createRuleSavedObject({
          id: 'r2',
          attributes: { apiKey: 'es-b', apiKeyCreatedByUser: false },
          version: '1',
        }),
      ]);

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
          {
            id: 'r2',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: {},
            references: [],
            version: '1',
            error: { error: 'Conflict', message: 'Conflict', statusCode: 409 },
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
      await runner.run();

      const orphanedKeyForR2 = Buffer.from('essu_1:uiam-b').toString('base64');
      expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledTimes(1);
      expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledWith(
        { apiKeys: [orphanedKeyForR2] },
        logger,
        savedObjectsClient
      );
    });

    it('handles mixed success and failed convert results', async () => {
      const uiamConvert = jest.fn().mockResolvedValue({
        results: [
          createConvertSuccessResult({ key: 'uiam-a' }),
          createConvertFailedResult({ message: 'Bad key', code: '400' }),
        ],
      });

      const { coreSetup, savedObjectsClient, encryptedSavedObjectsClient } =
        createMockCore(uiamConvert);

      mockPitFinderRules(encryptedSavedObjectsClient, [
        createRuleSavedObject({
          id: 'r1',
          attributes: { apiKey: 'es-a', apiKeyCreatedByUser: false },
          version: '1',
        }),
        createRuleSavedObject({
          id: 'r2',
          attributes: { apiKey: 'es-b', apiKeyCreatedByUser: false },
          version: '1',
        }),
      ]);

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
      expect(uiamConvert).toHaveBeenCalledWith(['es-a', 'es-b']);
      // uiamApiKey is stored as base64(id:key) per task implementation
      expect(savedObjectsClient.bulkUpdate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'r1',
            attributes: expect.objectContaining({
              uiamApiKey: Buffer.from('essu_0:uiam-a').toString('base64'),
            }),
            version: '1',
            mergeAttributes: false,
          }),
        ])
      );
      const bulkCreateCalls = savedObjectsClient.bulkCreate.mock.calls[0][0] as Array<{
        id: string;
        attributes: { status: string };
      }>;
      const statuses = bulkCreateCalls.map((c) => ({ id: c.id, status: c.attributes.status }));
      expect(statuses).toContainEqual({ id: 'r1', status: UiamApiKeyProvisioningStatus.COMPLETED });
      expect(statuses).toContainEqual({ id: 'r2', status: UiamApiKeyProvisioningStatus.FAILED });
      expect(logger.info).toHaveBeenCalledWith(
        'Wrote provisioning status: 2 total (0 skipped, 1 failed conversions, 1 completed, 0 failed updates).',
        { tags: TAGS }
      );
    });
  });
});
