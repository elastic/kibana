/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { loggerMock } from '@kbn/logging-mocks';

import { registerHistorySnapshotTask, stopHistorySnapshotTask } from './history_snapshot_task';
import type { EntityStoreCoreSetup } from '../types';
import { buildEaExecutionContext, EA_EXECUTION_CONTEXT_NAMES } from './execution_context';
import { EntityStoreGlobalStateClient } from '../domain/saved_objects';
import { HistorySnapshotClient } from '../domain/history_snapshot';
import { wrapTaskRun } from '../telemetry/traces';
import { cancelTask } from '../infra/elasticsearch';

jest.mock('./should_delete_orphaned_task', () => ({
  shouldDeleteOrphanedEntityStoreTask: jest.fn().mockResolvedValue(false),
}));
// Short-circuit tracing: return a canned result without invoking the inner run
// so the test focuses on the executionContext wrap introduced by this PR.
jest.mock('../telemetry/traces', () => ({
  wrapTaskRun: jest.fn().mockResolvedValue({ state: {} }),
}));
jest.mock('../domain/saved_objects', () => ({
  EntityStoreGlobalStateClient: jest.fn(),
}));
jest.mock('../domain/history_snapshot', () => ({
  HistorySnapshotClient: jest.fn(),
}));
jest.mock('../infra/elasticsearch', () => ({
  cancelTask: jest.fn(),
}));

beforeEach(() => {
  jest.mocked(cancelTask).mockClear();
});

describe('runHistorySnapshotTask — schedule reconciliation', () => {
  let core: EntityStoreCoreSetup;
  let logger: ReturnType<typeof loggerMock.create>;
  let mockFind: jest.Mock;
  let mockRunHistorySnapshot: jest.Mock;

  afterEach(() => {
    // Restore the short-circuit mock so the sibling describe block is unaffected.
    jest.mocked(wrapTaskRun).mockResolvedValue({ state: {} });
  });

  beforeEach(() => {
    // Make wrapTaskRun a transparent passthrough so runHistorySnapshotTask executes.
    jest
      .mocked(wrapTaskRun)
      .mockImplementation(({ run }: { run: () => Promise<unknown> }) => run());

    logger = loggerMock.create();
    (logger.get as jest.Mock) = jest.fn().mockReturnValue(logger);

    mockFind = jest.fn().mockResolvedValue({
      historySnapshot: { status: 'started', frequency: '24h', retentionDays: 60 },
      logsExtraction: {},
    });
    mockRunHistorySnapshot = jest.fn().mockResolvedValue({ ok: true, skipped: true });

    jest
      .mocked(EntityStoreGlobalStateClient)
      .mockImplementation(() => ({ find: mockFind } as unknown as EntityStoreGlobalStateClient));
    jest
      .mocked(HistorySnapshotClient)
      .mockImplementation(
        () => ({ runHistorySnapshot: mockRunHistorySnapshot } as unknown as HistorySnapshotClient)
      );

    core = {
      getStartServices: jest.fn().mockResolvedValue([
        {
          executionContext: {
            withContext: jest.fn((_ctx: unknown, fn: () => unknown) => fn()),
          },
          savedObjects: {
            getUnsafeInternalClient: jest
              .fn()
              .mockReturnValue({ asScopedToNamespace: jest.fn().mockReturnValue({}) }),
          },
          elasticsearch: { client: { asInternalUser: {} } },
        },
        { taskManager: {} },
      ]),
    } as unknown as EntityStoreCoreSetup;
  });

  const buildRunner = (taskInstanceOverrides: {
    schedule?: { interval: string };
    state?: Record<string, unknown>;
  }) => {
    const registerTaskDefinitions = jest.fn();
    const taskManager = { registerTaskDefinitions } as unknown as TaskManagerSetupContract;
    registerHistorySnapshotTask({ taskManager, logger, core });
    const [defs] = registerTaskDefinitions.mock.calls[0];
    const [taskType] = Object.keys(defs);
    return defs[taskType].createTaskRunner({
      taskInstance: {
        id: 'entity_store:v2:history_snapshot_task:default',
        state: { namespace: 'default' },
        ...taskInstanceOverrides,
      },
      signal: new AbortController().signal,
    });
  };

  it('returns the stored interval when the task is running at an outdated cadence', async () => {
    mockFind.mockResolvedValue({
      historySnapshot: { status: 'started', frequency: '6h', retentionDays: 60 },
      logsExtraction: {},
    });

    const result = await buildRunner({ schedule: { interval: '24h' } }).run();

    expect(result).toMatchObject({ schedule: { interval: '6h' } });
  });

  it('returns no schedule property when the stored interval matches the task cadence', async () => {
    mockFind.mockResolvedValue({
      historySnapshot: { status: 'started', frequency: '24h', retentionDays: 60 },
      logsExtraction: {},
    });

    const result = await buildRunner({ schedule: { interval: '24h' } }).run();

    expect(result).not.toHaveProperty('schedule');
  });

  it('logs a warning and omits schedule when the global-state read throws', async () => {
    mockFind.mockRejectedValue(new Error('SO unavailable'));

    const result = await buildRunner({ schedule: { interval: '24h' } }).run();

    expect(result).not.toHaveProperty('schedule');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('SO unavailable'));
  });

  describe('resumable cycle', () => {
    const run = {
      phase: 'reindex',
      esTaskId: 'node:1',
      latestIndex: '.entities.v2.latest.default',
      historySnapshotIndex: '.entities.v2.history.default.2026-11-03-08',
      timestampNow: '2026-11-03T08:00:00.000Z',
      cycleStartedAt: '2026-11-03T08:00:00.000Z',
      phaseStartedAt: '2026-11-03T08:00:00.000Z',
    };

    beforeEach(() => {
      jest.useFakeTimers({ now: new Date('2026-11-03T09:00:00.000Z') });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('passes the saved run and a deadline below the task timeout to the client', async () => {
      await buildRunner({
        schedule: { interval: '24h' },
        state: { namespace: 'default', run },
      }).run();

      expect(mockRunHistorySnapshot).toHaveBeenCalledWith({
        abortSignal: expect.any(AbortSignal),
        run,
        deadline: Date.now() + 25 * 60 * 1000,
      });
    });

    it('saves the unfinished run and asks to run again in a minute', async () => {
      mockRunHistorySnapshot.mockResolvedValue({ ok: true, inProgress: true, run });

      const result = await buildRunner({ schedule: { interval: '24h' } }).run();

      expect(result).toEqual({
        state: { namespace: 'default', run },
        runAt: new Date(Date.now() + 60 * 1000),
      });
    });

    it('anchors the next cycle to the start of a resumed cycle', async () => {
      mockRunHistorySnapshot.mockResolvedValue({
        ok: true,
        historySnapshotIndex: run.historySnapshotIndex,
        docCount: 1,
        resetCount: 1,
      });

      const result = await buildRunner({
        schedule: { interval: '24h' },
        state: { namespace: 'default', run },
      }).run();

      expect(result).toEqual({
        state: { namespace: 'default' },
        runAt: new Date('2026-11-04T08:00:00.000Z'),
      });
    });

    it('drops the saved run when the cycle fails', async () => {
      mockRunHistorySnapshot.mockResolvedValue({ ok: false, error: new Error('boom') });

      const result = await buildRunner({
        schedule: { interval: '24h' },
        state: { namespace: 'default', run },
      }).run();

      expect(result.state).toEqual({ namespace: 'default' });
    });
  });
});

describe('registerHistorySnapshotTask — state schema', () => {
  const getStateSchema = () => {
    const registerTaskDefinitions = jest.fn();
    registerHistorySnapshotTask({
      taskManager: { registerTaskDefinitions } as unknown as TaskManagerSetupContract,
      logger: loggerMock.create(),
      core: {} as EntityStoreCoreSetup,
    });
    const [defs] = registerTaskDefinitions.mock.calls[0];
    const [taskType] = Object.keys(defs);
    return defs[taskType].stateSchemaByVersion;
  };

  it('migrates v1 state to v2 without a run', () => {
    const { 2: v2 } = getStateSchema();

    const state = v2.up({ namespace: 'space-a' });

    expect(state).toEqual({ namespace: 'space-a' });
    expect(v2.schema.validate(state)).toEqual({ namespace: 'space-a' });
  });

  it('accepts a saved run in v2 state', () => {
    const { 2: v2 } = getStateSchema();
    const run = {
      phase: 'reset',
      esTaskId: 'node:1',
      latestIndex: 'latest',
      historySnapshotIndex: 'history',
      timestampNow: 't',
      cycleStartedAt: 't',
      phaseStartedAt: 't',
      docCount: 3,
    };

    expect(v2.schema.validate(v2.up({ namespace: 'default', run }))).toEqual({
      namespace: 'default',
      run,
    });
  });
});

describe('stopHistorySnapshotTask', () => {
  const esClient = {} as ElasticsearchClient;
  const taskId = 'entity_store:v2:history_snapshot_task:default';

  it('cancels the Elasticsearch task of an unfinished run before removing the task', async () => {
    const taskManager = {
      get: jest
        .fn()
        .mockResolvedValue({ state: { namespace: 'default', run: { esTaskId: 'n:1' } } }),
      removeIfExists: jest.fn(),
    } as unknown as TaskManagerStartContract;
    const logger = loggerMock.create();

    await stopHistorySnapshotTask({ taskManager, esClient, logger, namespace: 'default' });

    expect(cancelTask).toHaveBeenCalledWith({ esClient, taskId: 'n:1', logger });
    expect(taskManager.removeIfExists).toHaveBeenCalledWith(taskId);
  });

  it('still removes the task when it cannot be read', async () => {
    const taskManager = {
      get: jest.fn().mockRejectedValue(new Error('Not Found')),
      removeIfExists: jest.fn(),
    } as unknown as TaskManagerStartContract;

    await stopHistorySnapshotTask({
      taskManager,
      esClient,
      logger: loggerMock.create(),
      namespace: 'default',
    });

    expect(cancelTask).not.toHaveBeenCalled();
    expect(taskManager.removeIfExists).toHaveBeenCalledWith(taskId);
  });
});

describe('registerHistorySnapshotTask — execution context wrap', () => {
  it('invokes coreStart.executionContext.withContext with the history-snapshot label and taskInstance.id', async () => {
    const withContextSpy = jest.fn(<T>(_ctx: unknown, fn: () => T) => fn());
    const core = {
      getStartServices: jest
        .fn()
        .mockResolvedValue([{ executionContext: { withContext: withContextSpy } }]),
    } as unknown as EntityStoreCoreSetup;
    const registerTaskDefinitions = jest.fn();
    const taskManager = { registerTaskDefinitions } as unknown as TaskManagerSetupContract;
    const logger = loggerMock.create();
    (logger.get as jest.Mock) = jest.fn().mockReturnValue(logger);

    registerHistorySnapshotTask({ taskManager, logger, core });

    const [defs] = registerTaskDefinitions.mock.calls[0];
    const [taskType] = Object.keys(defs);
    const runner = defs[taskType].createTaskRunner({
      taskInstance: { id: 'history-snapshot:default', state: { namespace: 'default' } },
      signal: new AbortController().signal,
    });

    await runner.run();

    expect(withContextSpy).toHaveBeenCalledWith(
      buildEaExecutionContext(
        EA_EXECUTION_CONTEXT_NAMES.ENTITY_STORE_HISTORY_SNAPSHOT_TASK,
        'history-snapshot:default'
      ),
      expect.any(Function)
    );
  });
});
