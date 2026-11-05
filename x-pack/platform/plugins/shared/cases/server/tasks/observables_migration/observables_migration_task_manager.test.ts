/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import { loggingSystemMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import { TaskCost, TaskPriority } from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ObservablesMigrationTaskManager } from './observables_migration_task_manager';
import type { ObservablesMigrationRunResult } from './observables_migration_task_manager';
import { migrateObservablesPage } from './migrate_observables_page';
import type { MigratePageResult } from './migrate_observables_page';
import {
  closeLegacyCasesPointInTime,
  countLegacyObservables,
  fetchLegacyCasesPage,
  openLegacyCasesPointInTime,
  StalePointInTimeError,
} from './scan_cases';
import type { LegacyCasesPage } from './scan_cases';
import type { ObservablesMigrationState } from './types';
import { EMPTY_COUNTS } from './types';

jest.mock('./migrate_observables_page');
jest.mock('./scan_cases', () => ({
  ...jest.requireActual('./scan_cases'),
  countLegacyObservables: jest.fn(),
  openLegacyCasesPointInTime: jest.fn(),
  closeLegacyCasesPointInTime: jest.fn(),
  fetchLegacyCasesPage: jest.fn(),
}));

const migrateMock = migrateObservablesPage as jest.MockedFunction<typeof migrateObservablesPage>;
const countMock = countLegacyObservables as jest.MockedFunction<typeof countLegacyObservables>;
const openPitMock = openLegacyCasesPointInTime as jest.MockedFunction<
  typeof openLegacyCasesPointInTime
>;
const closePitMock = closeLegacyCasesPointInTime as jest.MockedFunction<
  typeof closeLegacyCasesPointInTime
>;
const fetchPageMock = fetchLegacyCasesPage as jest.MockedFunction<typeof fetchLegacyCasesPage>;

const TASK_TYPE = 'cases_observables_migration';

const page = (lastCreatedAt: number, done: boolean, pitId = 'pit-1'): LegacyCasesPage => ({
  cases: [
    {
      id: `case-${lastCreatedAt}`,
      owner: 'securitySolution',
      namespaces: ['default'],
      observables: [],
    },
  ],
  nextCursor: { pitId, searchAfter: [lastCreatedAt, 1], lastCreatedAt },
  done,
});

const pageResult = (observables: number): MigratePageResult => ({
  counts: { ...EMPTY_COUNTS, cases: 1, observables, created: observables },
  failedCaseIds: [],
  failureReasons: [],
});

const setup = () => {
  const taskManagerSetup = taskManagerMock.createSetup();
  const taskManagerStart = taskManagerMock.createStart();
  const repo = savedObjectsRepositoryMock.create();
  const core = {
    savedObjects: {
      createInternalRepository: jest.fn().mockReturnValue(repo),
      createSerializer: jest.fn().mockReturnValue({}),
    },
  } as unknown as CoreStart;
  const logger = loggingSystemMock.createLogger();
  const manager = new ObservablesMigrationTaskManager(taskManagerSetup, logger);
  const definition = taskManagerSetup.registerTaskDefinitions.mock.calls[0][0][TASK_TYPE];

  const run = async (
    state: ObservablesMigrationState,
    signal: AbortSignal = new AbortController().signal
  ): Promise<ObservablesMigrationRunResult> => {
    const runner = definition.createTaskRunner({
      taskInstance: { state },
      signal,
    } as unknown as RunContext);
    return (await runner.run()) as ObservablesMigrationRunResult;
  };

  return { manager, definition, taskManagerStart, core, repo, logger, run };
};

describe('ObservablesMigrationTaskManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    countMock.mockResolvedValue({ cases: 2, observables: 30 });
    openPitMock.mockResolvedValue('pit-1');
  });

  it('registers a bounded, low-priority task with a versioned state', () => {
    const { definition } = setup();

    expect(definition).toEqual(
      expect.objectContaining({
        timeout: '10m',
        cost: TaskCost.ExtraLarge,
        priority: TaskPriority.Maintenance,
      })
    );
    expect(definition.stateSchemaByVersion?.[1].up({ complete: true, unknown: 1 })).toEqual({
      complete: true,
    });
  });

  it('schedules the task once, keeping an existing task and its state', async () => {
    const { manager, taskManagerStart, core } = setup();

    await manager.scheduleTask(taskManagerStart, core);

    expect(taskManagerStart.removeIfExists).not.toHaveBeenCalled();
    expect(taskManagerStart.ensureScheduled).toHaveBeenCalledWith({
      id: 'cases:cases_observables_migration',
      taskType: TASK_TYPE,
      schedule: { interval: '1d' },
      params: {},
      state: {},
      scope: ['cases'],
    });
  });

  it('does nothing once complete', async () => {
    const { manager, taskManagerStart, core, run } = setup();
    await manager.scheduleTask(taskManagerStart, core);

    const state = { complete: true, runs: 3 };
    await expect(run(state)).resolves.toEqual({ state });
    expect(fetchPageMock).not.toHaveBeenCalled();
  });

  it('retries later when it runs before the plugin started', async () => {
    const { run } = setup();

    await expect(run({})).rejects.toThrow('ran before the cases plugin started');
  });

  it('migrates every page, then completes and closes the point in time', async () => {
    const { manager, taskManagerStart, core, run } = setup();
    await manager.scheduleTask(taskManagerStart, core);
    fetchPageMock.mockResolvedValueOnce(page(1000, false)).mockResolvedValueOnce(page(2000, true));
    migrateMock.mockResolvedValueOnce(pageResult(10)).mockResolvedValueOnce(pageResult(20));

    const result = await run({});

    expect(fetchPageMock.mock.calls[0][0].cursor).toEqual({ pitId: 'pit-1' });
    expect(fetchPageMock.mock.calls[1][0].cursor).toEqual(page(1000, false).nextCursor);
    expect(closePitMock).toHaveBeenCalledWith(expect.anything(), 'pit-1', expect.anything());
    expect(result).not.toHaveProperty('runAt');
    expect(result.state).toEqual(
      expect.objectContaining({
        complete: true,
        cursor: undefined,
        runs: 1,
        expected: { cases: 2, observables: 30 },
        totals: { ...EMPTY_COUNTS, cases: 2, observables: 30, created: 30 },
      })
    );
  });

  it('stops at the run budget and continues from the cursor a second later', async () => {
    const { manager, taskManagerStart, core, run } = setup();
    await manager.scheduleTask(taskManagerStart, core);
    const controller = new AbortController();
    fetchPageMock.mockResolvedValueOnce(page(1000, false));
    migrateMock.mockImplementationOnce(async () => {
      controller.abort();
      return pageResult(10);
    });

    const result = await run(
      { startedAt: '2026-11-05T00:00:00.000Z', runs: 1, expected: { cases: 2, observables: 30 } },
      controller.signal
    );

    expect(countMock).not.toHaveBeenCalled();
    expect(result.runAt).toBeInstanceOf(Date);
    expect(result.state).toEqual(
      expect.objectContaining({
        runs: 2,
        startedAt: '2026-11-05T00:00:00.000Z',
        cursor: page(1000, false).nextCursor,
      })
    );
    expect(result.state).not.toHaveProperty('complete');
  });

  it('reopens an expired point in time and resumes at the last created_at', async () => {
    const { manager, taskManagerStart, core, run } = setup();
    await manager.scheduleTask(taskManagerStart, core);
    openPitMock.mockResolvedValueOnce('pit-2');
    fetchPageMock
      .mockRejectedValueOnce(new StalePointInTimeError('gone'))
      .mockResolvedValueOnce(page(2000, true, 'pit-2'));
    migrateMock.mockResolvedValueOnce(pageResult(10));

    const result = await run({
      expected: { cases: 2, observables: 10 },
      cursor: { pitId: 'pit-old', searchAfter: [1000, 4], lastCreatedAt: 1000 },
    });

    expect(fetchPageMock.mock.calls[1][0].cursor).toEqual({ pitId: 'pit-2', lastCreatedAt: 1000 });
    expect(result.state).toEqual(expect.objectContaining({ complete: true }));
  });

  it('keeps the cursor of the last migrated page and retries after a failure', async () => {
    const { manager, taskManagerStart, core, run } = setup();
    await manager.scheduleTask(taskManagerStart, core);
    fetchPageMock.mockResolvedValueOnce(page(1000, false)).mockResolvedValueOnce(page(2000, false));
    migrateMock
      .mockResolvedValueOnce(pageResult(10))
      .mockRejectedValueOnce(new Error('es unavailable'));

    const result = await run({ expected: { cases: 2, observables: 30 } });

    expect(result.runAt).toBeInstanceOf(Date);
    expect(result.state).toEqual(
      expect.objectContaining({
        failedRuns: 1,
        cursor: page(1000, false).nextCursor,
        totals: expect.objectContaining({ observables: 10 }),
      })
    );
  });

  it('gives up after repeated failed runs', async () => {
    const { manager, taskManagerStart, core, run, logger } = setup();
    await manager.scheduleTask(taskManagerStart, core);
    fetchPageMock.mockRejectedValueOnce(new Error('es unavailable'));

    const result = await run({ expected: { cases: 2, observables: 30 }, failedRuns: 4 });

    expect(result).not.toHaveProperty('runAt');
    expect(result.state).toEqual(expect.objectContaining({ complete: true, failedRuns: 5 }));
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Giving up'));
  });
});
