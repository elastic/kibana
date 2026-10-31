/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, SavedObject } from '@kbn/core/server';
import { coreMock, loggingSystemMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import type { RunContext, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import type { CasePersistedAttributes } from '../../common/types/case';
import type { ObservablesService } from '../../services/observables';
import { createObservablesServiceMock } from '../../services/mocks';
import { runCleanupPhase } from './cleanup_phase';
import {
  CASES_OBSERVABLES_SYNC_TASK_ID,
  CASES_OBSERVABLES_SYNC_TASK_TYPE,
  OBSERVABLES_SYNC_PASS_VERSION,
} from './constants';
import { ObservablesSyncTaskManager } from './observables_sync_task_manager';
import { scanCases } from './scan_cases';
import { flagCasePending, syncCaseObservables } from './sync_case';
import {
  CASES_OBSERVABLES_SYNC_TASK_TIMEOUT,
  MAX_OBSERVABLES_SYNC_FAILED_RUNS,
  OBSERVABLES_SYNC_FAILURE_RESCHEDULE_DELAY_MS,
  OBSERVABLES_SYNC_IDLE_INTERVAL,
  OBSERVABLES_SYNC_RESCHEDULE_DELAY_MS,
} from './types';
import type { ObservablesSyncState } from './types';

jest.mock('./scan_cases');
jest.mock('./cleanup_phase');
jest.mock('./sync_case');

const scanCasesMock = jest.mocked(scanCases);
const runCleanupPhaseMock = jest.mocked(runCleanupPhase);
const syncCaseObservablesMock = jest.mocked(syncCaseObservables);
const flagCasePendingMock = jest.mocked(flagCasePending);

const COPY_FILTER = `${CASE_SAVED_OBJECT}.attributes.observables:{ value: * }`;
const PENDING_FILTER = `${CASE_SAVED_OBJECT}.attributes.observables_sync_pending: true`;

const buildCase = (id: string) =>
  ({
    id,
    type: CASE_SAVED_OBJECT,
    version: 'v1',
    namespaces: ['default'],
    references: [],
    attributes: { owner: 'securitySolution', observables: [] },
  } as unknown as SavedObject<CasePersistedAttributes>);

describe('ObservablesSyncTaskManager', () => {
  let taskManagerSetup: ReturnType<typeof taskManagerMock.createSetup>;
  let taskManagerStart: ReturnType<typeof taskManagerMock.createStart>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let repo: ReturnType<typeof savedObjectsRepositoryMock.create>;
  let core: ReturnType<typeof coreMock.createStart>;
  let observablesService: ReturnType<typeof createObservablesServiceMock>;
  let counter: { incrementCounter: jest.Mock };
  let manager: ObservablesSyncTaskManager;

  const getDefinition = () =>
    taskManagerSetup.registerTaskDefinitions.mock.calls[0][0][CASES_OBSERVABLES_SYNC_TASK_TYPE];

  const runTask = ({
    state = {},
    signal = new AbortController().signal,
  }: { state?: ObservablesSyncState; signal?: AbortSignal } = {}) =>
    getDefinition()
      .createTaskRunner({ taskInstance: { state }, signal } as unknown as RunContext)
      .run() as Promise<{ state: ObservablesSyncState; runAt?: Date }>;

  const schedule = () =>
    manager.scheduleSyncTask({
      taskManager: taskManagerStart as unknown as TaskManagerStartContract,
      core: core as unknown as CoreStart,
      observablesService: observablesService as unknown as ObservablesService,
    });

  beforeEach(async () => {
    jest.resetAllMocks();
    taskManagerSetup = taskManagerMock.createSetup();
    taskManagerStart = taskManagerMock.createStart();
    logger = loggingSystemMock.createLogger();
    repo = savedObjectsRepositoryMock.create();
    core = coreMock.createStart();
    core.savedObjects.createInternalRepository.mockReturnValue(repo);
    observablesService = createObservablesServiceMock();
    counter = { incrementCounter: jest.fn() };

    manager = new ObservablesSyncTaskManager(taskManagerSetup, logger, {
      createUsageCounter: jest.fn().mockReturnValue(counter),
    } as unknown as UsageCollectionSetup);
    await schedule();

    // Every phase completes without finding anything unless a test says otherwise.
    scanCasesMock.mockResolvedValue({ outcome: 'complete', scanned: 0 });
    runCleanupPhaseMock.mockResolvedValue({ outcome: 'complete', scanned: 0 });
  });

  describe('registration and scheduling', () => {
    it('registers the task with an explicit timeout and a state schema', () => {
      expect(getDefinition()).toMatchObject({
        timeout: CASES_OBSERVABLES_SYNC_TASK_TIMEOUT,
        stateSchemaByVersion: { 1: { schema: expect.anything() } },
      });
    });

    it('schedules a recurring task with a stable id and keeps an existing one and its state', () => {
      expect(core.savedObjects.createInternalRepository).toHaveBeenCalledWith([CASE_SAVED_OBJECT]);
      expect(taskManagerStart.ensureScheduled).toHaveBeenCalledWith({
        id: CASES_OBSERVABLES_SYNC_TASK_ID,
        taskType: CASES_OBSERVABLES_SYNC_TASK_TYPE,
        schedule: { interval: OBSERVABLES_SYNC_IDLE_INTERVAL },
        params: {},
        state: {},
        scope: ['cases'],
      });
      expect(taskManagerStart.removeIfExists).not.toHaveBeenCalled();
    });

    it('logs and does not throw when scheduling fails', async () => {
      taskManagerStart.ensureScheduled.mockRejectedValue(new Error('boom'));

      await expect(schedule()).resolves.toBeUndefined();
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('boom'));
    });

    it('fails the run for a retry when Task Manager runs it before start', async () => {
      const early = new ObservablesSyncTaskManager(taskManagerSetup, logger);
      expect(early).toBeDefined();
      const definition =
        taskManagerSetup.registerTaskDefinitions.mock.calls[1][0][CASES_OBSERVABLES_SYNC_TASK_TYPE];

      await expect(
        definition
          .createTaskRunner({
            taskInstance: { state: {} },
            signal: new AbortController().signal,
          } as unknown as RunContext)
          .run()
      ).rejects.toThrow('not initialized');
    });
  });

  describe('the first full pass', () => {
    it('runs the copy, cleanup and pending phases and records the pass as complete', async () => {
      const result = await runTask();

      expect(scanCasesMock).toHaveBeenCalledTimes(2);
      expect(scanCasesMock.mock.calls[0][0]).toMatchObject({ filter: COPY_FILTER });
      expect(scanCasesMock.mock.calls[1][0]).toMatchObject({ filter: PENDING_FILTER });
      expect(runCleanupPhaseMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        state: {
          completedPassVersion: OBSERVABLES_SYNC_PASS_VERSION,
          completedAt: expect.any(String),
        },
      });
      expect(counter.incrementCounter).toHaveBeenCalledWith({
        counterName: 'passCompleted',
        incrementBy: 1,
      });
    });

    it('logs the start and the completion of the pass', async () => {
      await runTask();

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Starting'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('pass 1 complete'));
    });

    it('syncs the cases the copy phase finds and counts them', async () => {
      syncCaseObservablesMock.mockResolvedValue({
        status: 'synced',
        created: 2,
        updated: 1,
        deleted: 3,
      });
      scanCasesMock.mockImplementationOnce(async ({ handleCase }) => {
        await handleCase(buildCase('case-1'));
        await handleCase(buildCase('case-2'));
        return { outcome: 'complete', scanned: 2 };
      });

      await runTask();

      expect(syncCaseObservablesMock).toHaveBeenCalledTimes(2);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining(
          '"casesSynced":2,"documentsCreated":4,"documentsUpdated":2,"documentsDeleted":6'
        )
      );
    });
  });

  describe('budgets and resuming', () => {
    it('saves where it stopped and reschedules soon when a phase pauses', async () => {
      const cursor = { pitId: 'pit-1', searchAfter: ['sort-1'] };
      scanCasesMock.mockResolvedValueOnce({ outcome: 'paused', scanned: 10, cursor });

      const result = await runTask();

      expect(runCleanupPhaseMock).not.toHaveBeenCalled();
      expect(result.state).toMatchObject({
        passVersion: OBSERVABLES_SYNC_PASS_VERSION,
        phase: 'copy',
        scan: cursor,
      });
      expect(result.runAt?.getTime()).toBeGreaterThanOrEqual(
        Date.now() + OBSERVABLES_SYNC_RESCHEDULE_DELAY_MS - 1000
      );
    });

    it('resumes the phase it stopped in with its cursor and skips the finished ones', async () => {
      const after = { caseId: 'case-9', spaceId: 'default' };

      await runTask({
        state: {
          passVersion: OBSERVABLES_SYNC_PASS_VERSION,
          phase: 'cleanup',
          cleanupAfter: after,
        },
      });

      expect(runCleanupPhaseMock).toHaveBeenCalledWith(expect.objectContaining({ after }));
      expect(scanCasesMock).toHaveBeenCalledTimes(1);
      expect(scanCasesMock.mock.calls[0][0]).toMatchObject({ filter: PENDING_FILTER });
    });

    it('carries the counts of earlier runs forward when it resumes', async () => {
      const counts = {
        casesSynced: 7,
        documentsCreated: 1,
        documentsUpdated: 0,
        documentsDeleted: 0,
        casesFlaggedPending: 0,
        orphanedCases: 0,
      };
      scanCasesMock.mockResolvedValueOnce({
        outcome: 'paused',
        scanned: 1,
        cursor: { pitId: 'p' },
      });

      const result = await runTask({
        state: { passVersion: OBSERVABLES_SYNC_PASS_VERSION, phase: 'copy', counts },
      });

      expect(result.state.counts).toEqual(counts);
    });

    it('starts over when the saved progress belongs to another pass version', async () => {
      await runTask({
        state: { passVersion: OBSERVABLES_SYNC_PASS_VERSION - 1, phase: 'cleanup' },
      });

      expect(scanCasesMock.mock.calls[0][0]).toMatchObject({ filter: COPY_FILTER });
    });

    it('stops its phases when the abort signal fires', async () => {
      const controller = new AbortController();
      await runTask({ signal: controller.signal });
      const { shouldPause } = scanCasesMock.mock.calls[0][0];

      expect(shouldPause()).toBe(false);
      controller.abort();
      expect(shouldPause()).toBe(true);
    });
  });

  describe('after the pass completed', () => {
    const completed: ObservablesSyncState = {
      completedPassVersion: OBSERVABLES_SYNC_PASS_VERSION,
      completedAt: '2026-01-01T00:00:00.000Z',
    };

    it('only runs the cleanup and pending phases and keeps the completion record', async () => {
      const result = await runTask({ state: completed });

      expect(runCleanupPhaseMock).toHaveBeenCalledTimes(1);
      expect(scanCasesMock).toHaveBeenCalledTimes(1);
      expect(scanCasesMock.mock.calls[0][0]).toMatchObject({ filter: PENDING_FILTER });
      expect(result).toEqual({ state: completed });
      expect(result.runAt).toBeUndefined();
    });

    it('keeps the completion record when a maintenance run pauses', async () => {
      runCleanupPhaseMock.mockResolvedValueOnce({
        outcome: 'paused',
        scanned: 1,
        after: { caseId: 'case-1', spaceId: 'default' },
      });

      const result = await runTask({ state: completed });

      expect(result.state).toMatchObject({
        ...completed,
        phase: 'cleanup',
        cleanupAfter: { caseId: 'case-1', spaceId: 'default' },
      });
      expect(result.state.passVersion).toBeUndefined();
      expect(result.runAt).toBeDefined();
    });
  });

  describe('failures', () => {
    it('flags a case that failed in the copy phase so the pending phase retries it', async () => {
      syncCaseObservablesMock.mockRejectedValue(new Error('index down'));
      flagCasePendingMock.mockResolvedValue(true);
      scanCasesMock.mockImplementationOnce(async ({ handleCase }) => {
        await handleCase(buildCase('case-1'));
        return { outcome: 'complete', scanned: 1 };
      });

      const result = await runTask();

      expect(flagCasePendingMock).toHaveBeenCalledWith(
        expect.objectContaining({ caseSO: expect.objectContaining({ id: 'case-1' }) })
      );
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('case-1'));
      expect(counter.incrementCounter).toHaveBeenCalledWith({
        counterName: 'caseSyncFailed',
        incrementBy: 1,
      });
      expect(result.state.completedPassVersion).toBe(OBSERVABLES_SYNC_PASS_VERSION);
    });

    it('starts the pass over when a failed case could not be flagged either', async () => {
      syncCaseObservablesMock.mockRejectedValue(new Error('index down'));
      flagCasePendingMock.mockResolvedValue(false);
      scanCasesMock.mockImplementationOnce(async ({ handleCase }) => {
        await handleCase(buildCase('case-1'));
        return { outcome: 'complete', scanned: 1 };
      });

      const result = await runTask();

      expect(result.state).toMatchObject({
        passVersion: OBSERVABLES_SYNC_PASS_VERSION,
        phase: 'copy',
        failedRuns: 1,
      });
      expect(result.state.completedPassVersion).toBeUndefined();
      expect(result.runAt?.getTime()).toBeGreaterThanOrEqual(
        Date.now() + OBSERVABLES_SYNC_FAILURE_RESCHEDULE_DELAY_MS - 1000
      );
    });

    it('starts the pass over when the cleanup phase fails for a case', async () => {
      runCleanupPhaseMock.mockImplementationOnce(async ({ onFailure }) => {
        onFailure({ caseId: 'case-1', spaceId: 'default' }, new Error('boom'));
        return { outcome: 'complete', scanned: 1 };
      });

      const result = await runTask();

      expect(result.state).toMatchObject({ phase: 'copy', failedRuns: 1 });
    });

    it('does not complete while the pending phase still has cases it could not sync', async () => {
      syncCaseObservablesMock.mockResolvedValue({
        status: 'pending',
        created: 0,
        updated: 0,
        deleted: 0,
      });
      scanCasesMock
        .mockResolvedValueOnce({ outcome: 'complete', scanned: 0 })
        .mockImplementationOnce(async ({ handleCase }) => {
          await handleCase(buildCase('case-1'));
          return { outcome: 'complete', scanned: 1 };
        });

      const result = await runTask();

      expect(result.state).toMatchObject({ phase: 'pending', failedRuns: 1 });
      expect(result.state.completedPassVersion).toBeUndefined();
    });

    it('counts a case the copy phase could not finish as flagged pending, not as a failure', async () => {
      syncCaseObservablesMock.mockResolvedValue({
        status: 'pending',
        created: 0,
        updated: 0,
        deleted: 0,
      });
      scanCasesMock.mockImplementationOnce(async ({ handleCase }) => {
        await handleCase(buildCase('case-1'));
        return { outcome: 'complete', scanned: 1 };
      });

      const result = await runTask();

      expect(result.state.completedPassVersion).toBe(OBSERVABLES_SYNC_PASS_VERSION);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('"casesFlaggedPending":1'));
    });

    it('keeps its progress and backs off when a run fails unexpectedly', async () => {
      scanCasesMock.mockRejectedValue(new Error('es unavailable'));
      const previousState: ObservablesSyncState = {
        passVersion: OBSERVABLES_SYNC_PASS_VERSION,
        phase: 'copy',
        scan: { pitId: 'pit-1' },
        failedRuns: 1,
      };

      const result = await runTask({ state: previousState });

      expect(result.state).toEqual({ ...previousState, failedRuns: 2 });
      expect(result.runAt).toBeDefined();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('es unavailable'),
        expect.anything()
      );
    });

    it('gives up until its next interval after enough failing runs in a row, keeping the completion record', async () => {
      scanCasesMock.mockRejectedValue(new Error('es unavailable'));
      const completed = {
        completedPassVersion: OBSERVABLES_SYNC_PASS_VERSION,
        completedAt: '2026-01-01T00:00:00.000Z',
      };

      const result = await runTask({
        state: {
          ...completed,
          phase: 'pending',
          failedRuns: MAX_OBSERVABLES_SYNC_FAILED_RUNS - 1,
        },
      });

      expect(result).toEqual({ state: completed });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Giving up'));
    });
  });
});
