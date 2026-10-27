/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { loggerMock } from '@kbn/logging-mocks';

import { registerHistorySnapshotTask } from './history_snapshot_task';
import type { EntityStoreCoreSetup } from '../types';
import { buildEaExecutionContext, EA_EXECUTION_CONTEXT_NAMES } from './execution_context';
import { EntityStoreGlobalStateClient } from '../domain/saved_objects';
import { HistorySnapshotClient } from '../domain/history_snapshot';
import { wrapTaskRun } from '../telemetry/traces';

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
      .mockImplementation(() => ({ find: mockFind }) as unknown as EntityStoreGlobalStateClient);
    jest
      .mocked(HistorySnapshotClient)
      .mockImplementation(
        () => ({ runHistorySnapshot: mockRunHistorySnapshot }) as unknown as HistorySnapshotClient
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
