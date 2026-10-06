/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server/task';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { loggerMock } from '@kbn/logging-mocks';

jest.mock('../infra/feature_flags', () => ({ isDualProcessEnabled: jest.fn() }));
jest.mock('./should_delete_orphaned_task', () => ({
  shouldDeleteOrphanedEntityStoreTask: jest.fn().mockResolvedValue(false),
}));
jest.mock('./factories', () => ({ createLogsExtractionClient: jest.fn() }));
jest.mock('../domain/config', () => ({
  getMergedConfig: jest.fn().mockReturnValue({ frequency: '1m' }),
}));

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { isDualProcessEnabled } from '../infra/feature_flags';
import { shouldDeleteOrphanedEntityStoreTask } from './should_delete_orphaned_task';
import { createLogsExtractionClient } from './factories';
import { getMergedConfig } from '../domain/config';
import {
  getExtractEntityTaskConfig,
  getExtractEntityTaskId,
  getNewSchedule,
  registerExtractEntityTasks,
} from './extract_entity_task';
import type * as types from '../types';
import type { EntityStoreCoreSetup } from '../types';
import { EXTRACTION_MODE } from '../../common/domain/definitions/entity_schema';
import { ENGINE_STATUS } from '../domain/constants';
import { EngineDescriptorTypeName } from '../domain/saved_objects';
import { entityStoreMetrics } from '../monitor/metrics';
import { EntityStoreNotRunningError, NonPriorityExtractionDisabledError } from '../domain/errors';
import { buildEaExecutionContext, EA_EXECUTION_CONTEXT_NAMES } from './execution_context';

const createTaskInstance = (schedule?: ConcreteTaskInstance['schedule']): ConcreteTaskInstance =>
  ({
    id: 'entity_store:v2:extract_entity_task:host:default',
    taskType: 'entity_store:v2:extract_entity_task:host',
    schedule,
  } as ConcreteTaskInstance);

describe('getNewSchedule', () => {
  it('returns a schedule when frequency differs from the current interval', () => {
    expect(getNewSchedule('22m', createTaskInstance({ interval: '1m' }))).toEqual({
      schedule: { interval: '22m' },
    });
  });

  it('returns undefined when frequency matches the current interval', () => {
    expect(getNewSchedule('1m', createTaskInstance({ interval: '1m' }))).toBeUndefined();
  });

  it('returns a schedule when the task has no interval', () => {
    expect(getNewSchedule('1m', createTaskInstance())).toEqual({
      schedule: { interval: '1m' },
    });
  });
});

describe('extract entity task identity', () => {
  it('single and priority share one task; nonPriority has its own', () => {
    expect(getExtractEntityTaskId('user', 'default', EXTRACTION_MODE.priority)).toBe(
      getExtractEntityTaskId('user', 'default', EXTRACTION_MODE.single)
    );
    expect(getExtractEntityTaskId('user', 'default', EXTRACTION_MODE.nonPriority)).not.toBe(
      getExtractEntityTaskId('user', 'default', EXTRACTION_MODE.single)
    );
  });

  it('defaults to the single task id, so existing callers are unchanged', () => {
    expect(getExtractEntityTaskId('user', 'default')).toBe(
      'entity_store:v2:extract_entity_task:user:default'
    );
  });

  it('each process resolves its own timeout and interval', () => {
    const priority = getExtractEntityTaskConfig(EXTRACTION_MODE.priority);
    const nonPriority = getExtractEntityTaskConfig(EXTRACTION_MODE.nonPriority);

    expect(nonPriority.type).not.toBe(priority.type);
    expect(nonPriority.timeout).toBeDefined();
    expect(nonPriority.interval).toBeDefined();
  });
});

describe('registerExtractEntityTasks', () => {
  const register = (entityTypes: Array<'user' | 'host'>) => {
    const registerTaskDefinitions = jest.fn();
    registerExtractEntityTasks({
      taskManager: { registerTaskDefinitions } as unknown as TaskManagerSetupContract,
      logger: loggerMock.create(),
      entityTypes,
      core: {} as types.EntityStoreCoreSetup,
      isServerless: false,
    });
    return registerTaskDefinitions.mock.calls.flatMap((call) => Object.keys(call[0]));
  };

  /** Definitions are registered during setup, before the flag is readable, so registration must
   * not depend on it. Only execution does. */
  it('registers a non-priority task for a dual-capable type, regardless of the flag', () => {
    const registered = register(['user']);

    expect(registered).toContain('entity_store:v2:extract_entity_task:user');
    expect(registered).toContain('entity_store:v2:extract_entity_non_priority_task:user');
  });

  it('registers only the single task for a type with no priority variant', () => {
    const registered = register(['host']);

    expect(registered).toEqual(['entity_store:v2:extract_entity_task:host']);
  });
});

/**
 * Registration is unconditional, so the flag has to be read per run: it can be flipped while a
 * task is already scheduled. Non-priority extraction exists only in dual-process mode, so with the
 * flag off the run must do nothing rather than fall back to another mode.
 */
describe('feature flag gates non-priority execution', () => {
  const mockIsDualProcessEnabled = isDualProcessEnabled as jest.MockedFunction<
    typeof isDualProcessEnabled
  >;
  const mockCreateClient = createLogsExtractionClient as jest.MockedFunction<
    typeof createLogsExtractionClient
  >;

  const runTaskFor = async (taskTypeSuffix: string, flagEnabled: boolean) => {
    jest.clearAllMocks();
    mockIsDualProcessEnabled.mockResolvedValue(flagEnabled);
    mockCreateClient.mockResolvedValue({
      logsExtractionClient: {
        extractLogs: jest.fn().mockResolvedValue({ success: true, isRemote: false, count: 0 }),
        getMergedConfigForType: jest.fn().mockResolvedValue({ frequency: '1m' }),
      },
    } as unknown as Awaited<ReturnType<typeof createLogsExtractionClient>>);

    const definitions: Record<string, { createTaskRunner: Function }> = {};
    registerExtractEntityTasks({
      taskManager: {
        registerTaskDefinitions: (defs: Record<string, { createTaskRunner: Function }>) =>
          Object.assign(definitions, defs),
      } as unknown as TaskManagerSetupContract,
      logger: loggerMock.create(),
      entityTypes: ['user'],
      core: {
        getStartServices: jest.fn().mockResolvedValue([
          {
            featureFlags: {},
            executionContext: { withContext: jest.fn(<T>(_ctx: unknown, fn: () => T) => fn()) },
          },
        ]),
      } as unknown as types.EntityStoreCoreSetup,
      isServerless: false,
    });

    const definition = definitions[`entity_store:v2:${taskTypeSuffix}:user`];
    await definition
      .createTaskRunner({
        taskInstance: { id: 'task-id', state: { namespace: 'default' } },
        fakeRequest: {},
        signal: new AbortController().signal,
      })
      .run();
  };

  it('does not extract when the flag is off', async () => {
    await runTaskFor('extract_entity_non_priority_task', false);

    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('extracts in nonPriority mode when the flag is on', async () => {
    await runTaskFor('extract_entity_non_priority_task', true);

    expect(mockCreateClient).toHaveBeenCalledWith(
      expect.objectContaining({ extractionMode: EXTRACTION_MODE.nonPriority })
    );
  });

  it('the priority task still runs when the flag is off, as single', async () => {
    await runTaskFor('extract_entity_task', false);

    expect(mockCreateClient).toHaveBeenCalledWith(
      expect.objectContaining({ extractionMode: EXTRACTION_MODE.single })
    );
  });

  it('the priority task runs as priority when the flag is on', async () => {
    await runTaskFor('extract_entity_task', true);

    expect(mockCreateClient).toHaveBeenCalledWith(
      expect.objectContaining({ extractionMode: EXTRACTION_MODE.priority })
    );
  });
});

describe('extract entity task metrics', () => {
  const mockIsDualProcessEnabled = isDualProcessEnabled as jest.MockedFunction<
    typeof isDualProcessEnabled
  >;
  const mockCreateClient = createLogsExtractionClient as jest.MockedFunction<
    typeof createLogsExtractionClient
  >;

  let taskSuccess: jest.SpyInstance;
  let taskError: jest.SpyInstance;
  let taskDuration: jest.SpyInstance;

  const runWith = async (
    taskTypeSuffix: string,
    extractionResult: Record<string, unknown>,
    flagEnabled = true
  ) => {
    jest.clearAllMocks();
    taskSuccess = jest.spyOn(entityStoreMetrics.extractionTaskSuccess, 'add').mockImplementation();
    taskError = jest.spyOn(entityStoreMetrics.extractionTaskError, 'add').mockImplementation();
    taskDuration = jest
      .spyOn(entityStoreMetrics.extractionTaskDurationMs, 'record')
      .mockImplementation();

    mockIsDualProcessEnabled.mockResolvedValue(flagEnabled);
    mockCreateClient.mockResolvedValue({
      logsExtractionClient: {
        extractLogs: jest.fn().mockResolvedValue(extractionResult),
        getMergedConfigForType: jest.fn().mockResolvedValue({ frequency: '1m' }),
      },
    } as unknown as Awaited<ReturnType<typeof createLogsExtractionClient>>);

    const definitions: Record<string, { createTaskRunner: Function }> = {};
    registerExtractEntityTasks({
      taskManager: {
        registerTaskDefinitions: (defs: Record<string, { createTaskRunner: Function }>) =>
          Object.assign(definitions, defs),
      } as unknown as TaskManagerSetupContract,
      logger: loggerMock.create(),
      entityTypes: ['user'],
      core: {
        getStartServices: jest.fn().mockResolvedValue([
          {
            featureFlags: {},
            executionContext: {
              withContext: jest.fn().mockImplementation((_ctx: unknown, fn: () => unknown) => fn()),
            },
          },
        ]),
      } as unknown as types.EntityStoreCoreSetup,
      isServerless: false,
    });

    await definitions[`entity_store:v2:${taskTypeSuffix}:user`]
      .createTaskRunner({
        taskInstance: { id: 'task-id', state: { namespace: 'default' } },
        fakeRequest: {},
        signal: new AbortController().signal,
      })
      .run();
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('records no task error when the non-priority process is switched off', async () => {
    await runWith('extract_entity_non_priority_task', {
      success: false,
      isRemote: false,
      error: new NonPriorityExtractionDisabledError(),
    });

    // A deliberately idle process must not look permanently broken on a dashboard.
    expect(taskError).not.toHaveBeenCalled();
    expect(taskSuccess).not.toHaveBeenCalled();
  });

  it('records a task error with a diagnostic error_type for a real failure', async () => {
    await runWith('extract_entity_task', {
      success: false,
      isRemote: false,
      error: new EntityStoreNotRunningError('Entity store is not started for type user'),
    });

    expect(taskError).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        extraction_mode: EXTRACTION_MODE.priority,
        // Previously every soft failure collapsed to the generic 'Error'.
        error_type: 'EntityStoreNotRunningError',
      })
    );
  });

  it('labels task metrics with the extraction mode and records run duration', async () => {
    await runWith('extract_entity_non_priority_task', {
      success: true,
      isRemote: false,
      count: 3,
    });

    expect(taskSuccess).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ extraction_mode: EXTRACTION_MODE.nonPriority })
    );
    expect(taskDuration).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({ extraction_mode: EXTRACTION_MODE.nonPriority })
    );
  });
});

describe('non-priority task orphan cleanup', () => {
  const mockIsDualProcessEnabled = isDualProcessEnabled as jest.MockedFunction<
    typeof isDualProcessEnabled
  >;
  const mockShouldDeleteOrphanedTask = shouldDeleteOrphanedEntityStoreTask as jest.MockedFunction<
    typeof shouldDeleteOrphanedEntityStoreTask
  >;
  const mockCreateClient = createLogsExtractionClient as jest.MockedFunction<
    typeof createLogsExtractionClient
  >;

  const runNonPriorityTask = async (flagEnabled: boolean, isOrphaned: boolean) => {
    jest.clearAllMocks();
    mockIsDualProcessEnabled.mockResolvedValue(flagEnabled);
    mockShouldDeleteOrphanedTask.mockResolvedValue(isOrphaned);

    const definitions: Record<string, { createTaskRunner: Function }> = {};
    registerExtractEntityTasks({
      taskManager: {
        registerTaskDefinitions: (defs: Record<string, { createTaskRunner: Function }>) =>
          Object.assign(definitions, defs),
      } as unknown as TaskManagerSetupContract,
      logger: loggerMock.create(),
      entityTypes: ['user'],
      core: {
        getStartServices: jest.fn().mockResolvedValue([
          {
            featureFlags: {},
            executionContext: { withContext: jest.fn(<T>(_ctx: unknown, fn: () => T) => fn()) },
          },
        ]),
      } as unknown as types.EntityStoreCoreSetup,
      isServerless: false,
    });

    const definition = definitions['entity_store:v2:extract_entity_non_priority_task:user'];
    return definition
      .createTaskRunner({
        taskInstance: { id: 'task-id', state: { namespace: 'default' } },
        fakeRequest: {},
        signal: new AbortController().signal,
      })
      .run();
  };

  it('returns shouldDeleteTask when orphaned and the flag is off', async () => {
    const result = await runNonPriorityTask(false, true);

    expect(result).toEqual(expect.objectContaining({ shouldDeleteTask: true }));
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('returns empty state (no delete) when not orphaned and the flag is off', async () => {
    const result = await runNonPriorityTask(false, false);

    expect(result).not.toHaveProperty('shouldDeleteTask');
    expect(mockCreateClient).not.toHaveBeenCalled();
  });
});

describe('bootstrapNonPriorityTask', () => {
  const mockIsDualProcessEnabled = isDualProcessEnabled as jest.MockedFunction<
    typeof isDualProcessEnabled
  >;
  const mockGetMergedConfig = getMergedConfig as jest.MockedFunction<typeof getMergedConfig>;
  const mockCreateClient = createLogsExtractionClient as jest.MockedFunction<
    typeof createLogsExtractionClient
  >;

  const makeDescriptorSo = (status: string, logExtractionConfig?: Record<string, unknown>) => ({
    id: `${EngineDescriptorTypeName}-user-default`,
    type: EngineDescriptorTypeName,
    attributes: {
      type: 'user',
      status,
      nonPriorityStatus: ENGINE_STATUS.STOPPED,
      logExtractionConfig: logExtractionConfig ?? null,
      logExtractionState: {
        checkpointTimestamp: null,
        paginationId: null,
        lastExecutionTimestamp: null,
        sliceEndTimestamp: null,
      },
      versionState: { version: '2', state: 'running', isMigratedFromV1: false },
      error: null,
    },
    references: [],
    score: 0,
  });

  const makeGlobalStateSo = (logsExtraction: Record<string, unknown> = {}) => ({
    id: 'entity-store-global-state-default',
    type: 'entity-store-global-state',
    attributes: { logsExtraction },
    references: [],
    score: 0,
  });

  const runPriorityTask = async ({
    engineStatus,
    mergedFrequency = '1m',
    logExtractionConfig,
    globalStateOverrides = {},
  }: {
    engineStatus: string;
    mergedFrequency?: string;
    logExtractionConfig?: Record<string, unknown>;
    globalStateOverrides?: Record<string, unknown>;
  }) => {
    jest.clearAllMocks();
    mockIsDualProcessEnabled.mockResolvedValue(true);
    mockGetMergedConfig.mockReturnValue({ frequency: mergedFrequency } as ReturnType<
      typeof getMergedConfig
    >);
    mockCreateClient.mockResolvedValue({
      logsExtractionClient: {
        extractLogs: jest.fn().mockResolvedValue({ success: true, isRemote: false, count: 0 }),
        getMergedConfigForType: jest.fn().mockResolvedValue({ frequency: '1m' }),
      },
    } as unknown as Awaited<ReturnType<typeof createLogsExtractionClient>>);

    const mockEnsureScheduled = jest.fn().mockResolvedValue(undefined);
    const soClient = savedObjectsClientMock.create();
    soClient.find.mockResolvedValue({
      saved_objects: [makeDescriptorSo(engineStatus, logExtractionConfig)],
      total: 1,
      per_page: 10,
      page: 1,
    });
    soClient.get.mockResolvedValue(makeGlobalStateSo(globalStateOverrides));

    const definitions: Record<string, { createTaskRunner: Function }> = {};
    registerExtractEntityTasks({
      taskManager: {
        registerTaskDefinitions: (defs: Record<string, { createTaskRunner: Function }>) =>
          Object.assign(definitions, defs),
      } as unknown as TaskManagerSetupContract,
      logger: loggerMock.create(),
      entityTypes: ['user'],
      core: {
        getStartServices: jest.fn().mockResolvedValue([
          {
            featureFlags: {},
            savedObjects: {
              createInternalRepository: jest.fn().mockReturnValue(soClient),
              getUnsafeInternalClient: jest.fn().mockReturnValue({
                asScopedToNamespace: jest.fn().mockReturnValue(soClient),
              }),
            },
            executionContext: { withContext: jest.fn(<T>(_ctx: unknown, fn: () => T) => fn()) },
          },
          { taskManager: { ensureScheduled: mockEnsureScheduled } },
        ]),
      } as unknown as types.EntityStoreCoreSetup,
      isServerless: false,
    });

    const definition = definitions['entity_store:v2:extract_entity_task:user'];
    await definition
      .createTaskRunner({
        taskInstance: { id: 'task-id', state: { namespace: 'default' } },
        fakeRequest: {},
        signal: new AbortController().signal,
      })
      .run();

    return { mockEnsureScheduled, soClient };
  };

  it('does not schedule the non-priority task when the engine is stopped', async () => {
    const { mockEnsureScheduled } = await runPriorityTask({
      engineStatus: ENGINE_STATUS.STOPPED,
    });

    expect(mockEnsureScheduled).not.toHaveBeenCalled();
  });

  it('schedules the non-priority task when the engine is started', async () => {
    const { mockEnsureScheduled } = await runPriorityTask({
      engineStatus: ENGINE_STATUS.STARTED,
    });

    expect(mockEnsureScheduled).toHaveBeenCalledTimes(1);
  });

  it('uses the merged config frequency as the task schedule interval', async () => {
    const { mockEnsureScheduled } = await runPriorityTask({
      engineStatus: ENGINE_STATUS.STARTED,
      mergedFrequency: '5m',
    });

    expect(mockEnsureScheduled).toHaveBeenCalledWith(
      expect.objectContaining({ schedule: { interval: '5m' } }),
      expect.anything()
    );
  });

  it('passes the engine logExtractionConfig to getMergedConfig', async () => {
    const logExtractionConfig = { frequency: '3m' };
    await runPriorityTask({
      engineStatus: ENGINE_STATUS.STARTED,
      logExtractionConfig,
    });

    expect(mockGetMergedConfig).toHaveBeenCalledWith(
      'user',
      expect.any(Object),
      logExtractionConfig,
      EXTRACTION_MODE.nonPriority,
      undefined
    );
  });

  it('passes global overrides to getMergedConfig so frequency changes reschedule the non-priority task', async () => {
    await runPriorityTask({
      engineStatus: ENGINE_STATUS.STARTED,
      globalStateOverrides: { frequency: '5m' },
    });

    expect(mockGetMergedConfig).toHaveBeenCalledWith(
      'user',
      expect.objectContaining({ frequency: '5m' }),
      null,
      EXTRACTION_MODE.nonPriority,
      undefined
    );
  });
});

describe('registerExtractEntityTasks — execution context wrap', () => {
  it('invokes coreStart.executionContext.withContext with the extract-task label and taskInstance.id', async () => {
    const mockIsDualProcessEnabled = isDualProcessEnabled as jest.MockedFunction<
      typeof isDualProcessEnabled
    >;
    const mockCreateClient = createLogsExtractionClient as jest.MockedFunction<
      typeof createLogsExtractionClient
    >;

    mockIsDualProcessEnabled.mockResolvedValue(false);
    mockCreateClient.mockResolvedValue({
      logsExtractionClient: {
        extractLogs: jest.fn().mockResolvedValue({ success: true, isRemote: false, count: 0 }),
        getMergedConfigForType: jest.fn().mockResolvedValue({ frequency: '1m' }),
      },
    } as unknown as Awaited<ReturnType<typeof createLogsExtractionClient>>);

    const withContextSpy = jest.fn(<T>(_ctx: unknown, fn: () => T) => fn());
    const core = {
      getStartServices: jest
        .fn()
        .mockResolvedValue([
          { featureFlags: {}, executionContext: { withContext: withContextSpy } },
        ]),
    } as unknown as EntityStoreCoreSetup;
    const registerTaskDefinitions = jest.fn();
    const taskManager = { registerTaskDefinitions } as unknown as TaskManagerSetupContract;
    const logger = loggerMock.create();
    (logger.get as jest.Mock) = jest.fn().mockReturnValue(logger);

    registerExtractEntityTasks({
      taskManager,
      logger,
      entityTypes: ['host'],
      core,
      isServerless: false,
    });

    const [defs] = registerTaskDefinitions.mock.calls[0];
    const [taskType] = Object.keys(defs);
    const runner = defs[taskType].createTaskRunner({
      taskInstance: { id: 'task-1', state: { namespace: 'default' } },
      fakeRequest: {},
      signal: new AbortController().signal,
      executionUuid: 'run-1',
      setCustomTaskRunEventFields: jest.fn(),
    });

    await runner.run();

    expect(withContextSpy).toHaveBeenCalledWith(
      buildEaExecutionContext(EA_EXECUTION_CONTEXT_NAMES.ENTITY_STORE_EXTRACT_TASK, 'task-1'),
      expect.any(Function)
    );
  });
});
