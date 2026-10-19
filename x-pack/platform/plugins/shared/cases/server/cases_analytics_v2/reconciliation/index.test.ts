/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type {
  TaskManagerSetupContract,
  ConcreteTaskInstance,
} from '@kbn/task-manager-plugin/server';
import { V2_NOOP_WRITER } from '../writer';
import { V2_NOOP_ACTIVITY_WRITER } from '../writer/activity';
import { V2_NOOP_ATTACHMENTS_WRITER } from '../writer/attachments';
import { runReconciliation } from './runner';
import { runActivityReconciliation } from './activity_runner';
import { runAttachmentsReconciliation } from './attachments_runner';
import {
  clampCursorToNotFuture,
  registerReconciliationTask,
  resetReconciliationTask,
  RECONCILIATION_TASK_ID,
  RECONCILIATION_TASK_TYPE,
} from '.';

jest.mock('./runner');
jest.mock('./activity_runner');
jest.mock('./attachments_runner');
const mockRunReconciliation = runReconciliation as jest.MockedFunction<typeof runReconciliation>;
const mockRunActivityReconciliation = runActivityReconciliation as jest.MockedFunction<
  typeof runActivityReconciliation
>;
const mockRunAttachmentsReconciliation = runAttachmentsReconciliation as jest.MockedFunction<
  typeof runAttachmentsReconciliation
>;

describe('clampCursorToNotFuture', () => {
  const logger = loggerMock.create();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the cursor as-is when it is in the past', () => {
    const past = '2026-01-01T00:00:00.000Z';
    expect(clampCursorToNotFuture(past, logger)).toBe(past);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('returns undefined for a missing cursor (first-ever run)', () => {
    expect(clampCursorToNotFuture(undefined, logger)).toBeUndefined();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  /**
   * A future cursor (clock skew or manual SO tampering) would freeze
   * incremental reconciliation: cases would stop appearing in
   * analytics with no errors logged until wall time catches up.
   * Clamping returns `undefined` so the next tick does a full
   * backfill and then resumes incremental.
   */
  it('returns undefined and warns when the cursor is in the future', () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    expect(clampCursorToNotFuture(future, logger)).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('persisted reconciliation cursor is in the future')
    );
  });

  /**
   * A corrupted (unparseable) cursor would be passed straight into
   * the KQL filter and silently match nothing, freezing
   * reconciliation. The clamp falls back to a full backfill on the
   * next tick.
   */
  it('returns undefined and warns when the cursor is unparseable', () => {
    expect(clampCursorToNotFuture('not-a-date', logger)).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('persisted reconciliation cursor is unparseable')
    );
  });
});

describe('resetReconciliationTask', () => {
  const logger = loggerMock.create();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('ensures the task is scheduled before clearing state (so the update target exists)', async () => {
    // ensureScheduled guarantees a task SO is on disk for
    // bulkUpdateState to write into. A `remove()` flow would have a
    // silent failure path when the task SO can't be deleted for
    // non-404 reasons.
    const tm = taskManagerMock.createStart();

    await resetReconciliationTask({
      taskManager: tm,
      logger,
      intervalMinutes: 30,
    });

    expect(tm.ensureScheduled).toHaveBeenCalledTimes(1);
    expect(tm.ensureScheduled).toHaveBeenCalledWith(
      expect.objectContaining({
        id: RECONCILIATION_TASK_ID,
        schedule: { interval: '30m' },
        state: {},
      })
    );
    expect(tm.bulkUpdateState).toHaveBeenCalledTimes(1);
    // Order matters: ensureScheduled must complete before bulkUpdateState.
    const ensureOrder = (tm.ensureScheduled as jest.Mock).mock.invocationCallOrder[0];
    const updateOrder = (tm.bulkUpdateState as jest.Mock).mock.invocationCallOrder[0];
    expect(ensureOrder).toBeLessThan(updateOrder);
  });

  /**
   * `/reset` must atomically rewrite the reconciliation task's
   * persisted state. A `remove` + `ensureScheduled` flow leaves the
   * stale cursor behind whenever `remove` fails for anything other
   * than 404 (cluster blip, locked SO, transient ES error), so the
   * next tick walks `updated_at > stale_cursor` and excludes every
   * case the user hasn't touched. `bulkUpdateState` writes the new
   * state regardless of whether the SO already existed.
   */
  it('force-rewrites task state via bulkUpdateState (no remove dependency)', async () => {
    const tm = taskManagerMock.createStart();

    await resetReconciliationTask({
      taskManager: tm,
      logger,
      intervalMinutes: 30,
      initialState: { cases_last_run_at: '2026-05-14T20:00:00.000Z' },
    });

    expect(tm.remove).not.toHaveBeenCalled();
    expect(tm.bulkUpdateState).toHaveBeenCalledTimes(1);
    const [ids, mapFn] = (tm.bulkUpdateState as jest.Mock).mock.calls[0];
    expect(ids).toEqual([RECONCILIATION_TASK_ID]);
    // The map function receives the (irrelevant) prior state and
    // returns the supplied initialState. Pin the contract so a
    // refactor that "preserves" old fields can't silently undo the
    // reset.
    expect(typeof mapFn).toBe('function');
    expect(
      mapFn({ cases_last_run_at: 'stale-cursor', other: 'field' }, RECONCILIATION_TASK_ID)
    ).toEqual({
      cases_last_run_at: '2026-05-14T20:00:00.000Z',
    });
  });

  it('defaults initialState to {} so a no-arg reset performs a full backfill on the next tick', async () => {
    const tm = taskManagerMock.createStart();

    await resetReconciliationTask({
      taskManager: tm,
      logger,
      intervalMinutes: 30,
    });

    const [, mapFn] = (tm.bulkUpdateState as jest.Mock).mock.calls[0];
    expect(mapFn({ cases_last_run_at: 'anything' }, RECONCILIATION_TASK_ID)).toEqual({});
  });

  it('does not throw past the boundary when bulkUpdateState fails (logs at WARN)', async () => {
    // bulkUpdateState can fail if the SO is locked by an in-flight tick
    // or on a transient cluster blip. The reset path runs from a route
    // handler that has already done useful work (dropped + recreated the
    // index, deleted data views, kicked off a direct re-walk); a failure
    // here must not roll those back.
    const tm = taskManagerMock.createStart();
    (tm.bulkUpdateState as jest.Mock).mockRejectedValueOnce(new Error('locked'));

    await expect(
      resetReconciliationTask({ taskManager: tm, logger, intervalMinutes: 30 })
    ).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('locked'));
  });

  it('resolves even when ensureScheduled rejects during scheduling', async () => {
    // End-to-end resilience: an ensureScheduled failure must not break reset. Note that
    // scheduleReconciliationTask swallows this internally, so the rejection never actually reaches
    // resetReconciliationTask's own try — this pins the composed "reset never throws on a scheduling
    // hiccup" behavior, not the try boundary itself (no current input makes scheduling throw).
    // bulkUpdateState still runs and resolves.
    const tm = taskManagerMock.createStart();
    (tm.ensureScheduled as jest.Mock).mockRejectedValueOnce(new Error('tm unavailable'));

    await expect(
      resetReconciliationTask({ taskManager: tm, logger, intervalMinutes: 30 })
    ).resolves.toBeUndefined();
    // bulkUpdateState is reached despite the scheduling hiccup.
    expect(tm.bulkUpdateState).toHaveBeenCalledTimes(1);
  });
});

describe('registerReconciliationTask run()', () => {
  const logger = loggerMock.create();

  /**
   * Registers the task, pulls out the `run()` closure Task Manager would
   * invoke, and hands the caller a `signal` it can pre-abort or trip
   * between surfaces. The three runner modules are mocked (see the
   * top-level `jest.mock` calls) so the tests exercise only the
   * orchestration in `createTaskRunner`, not the walks themselves.
   */
  const setupRun = ({
    signal = new AbortController().signal,
    state = {},
  }: { signal?: AbortSignal; state?: Record<string, unknown> } = {}) => {
    const taskManager = taskManagerMock.createSetup() as unknown as TaskManagerSetupContract;
    const savedObjectsClient = savedObjectsClientMock.create();

    registerReconciliationTask({
      taskManager,
      logger,
      getRunnerDeps: async () => ({
        savedObjectsClient,
        writer: V2_NOOP_WRITER,
        activityWriter: V2_NOOP_ACTIVITY_WRITER,
        attachmentsWriter: V2_NOOP_ATTACHMENTS_WRITER,
      }),
    });

    const registerFn = (taskManager as unknown as { registerTaskDefinitions: jest.Mock })
      .registerTaskDefinitions;
    const definition = registerFn.mock.calls[0][0][RECONCILIATION_TASK_TYPE];
    const run = definition.createTaskRunner({
      taskInstance: { state } as unknown as ConcreteTaskInstance,
      signal,
    }).run as () => Promise<{ state: Record<string, unknown>; taskRunError?: unknown }>;

    return { run };
  };

  beforeEach(() => {
    mockRunReconciliation.mockResolvedValue({ newLastRunAt: 'CASES_NEW', processed: 1 });
    mockRunActivityReconciliation.mockResolvedValue({ newLastRunAt: 'ACTIVITY_NEW', processed: 1 });
    mockRunAttachmentsReconciliation.mockResolvedValue({
      newLastRunAt: 'ATTACHMENTS_NEW',
      processed: 1,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('runs all three surfaces in order on the happy path and advances every cursor', async () => {
    const { run } = setupRun();

    const { state, taskRunError } = await run();

    expect(mockRunReconciliation).toHaveBeenCalledTimes(1);
    expect(mockRunActivityReconciliation).toHaveBeenCalledTimes(1);
    expect(mockRunAttachmentsReconciliation).toHaveBeenCalledTimes(1);
    // Cases must lead so a downstream LOOKUP JOIN sees the dimension row
    // at least as fresh as the fact rows referencing it.
    const casesOrder = mockRunReconciliation.mock.invocationCallOrder[0];
    const activityOrder = mockRunActivityReconciliation.mock.invocationCallOrder[0];
    const attachmentsOrder = mockRunAttachmentsReconciliation.mock.invocationCallOrder[0];
    expect(casesOrder).toBeLessThan(activityOrder);
    expect(activityOrder).toBeLessThan(attachmentsOrder);

    expect(state).toEqual({
      cases_last_run_at: 'CASES_NEW',
      activity_last_run_at: 'ACTIVITY_NEW',
      attachments_last_run_at: 'ATTACHMENTS_NEW',
    });
    expect(taskRunError).toBeUndefined();
  });

  it('skips every surface when the signal is already aborted, carrying the prior cursors forward pinned', async () => {
    const controller = new AbortController();
    controller.abort();
    const { run } = setupRun({
      signal: controller.signal,
      state: {
        cases_last_run_at: '2026-05-01T00:00:00.000Z',
        activity_last_run_at: '2026-05-02T00:00:00.000Z',
        attachments_last_run_at: '2026-05-03T00:00:00.000Z',
      },
    });

    const { state, taskRunError } = await run();

    // No surface ran; all three guards short-circuited.
    expect(mockRunReconciliation).not.toHaveBeenCalled();
    expect(mockRunActivityReconciliation).not.toHaveBeenCalled();
    expect(mockRunAttachmentsReconciliation).not.toHaveBeenCalled();
    // Prior cursors survive unchanged so the next tick re-walks each window.
    expect(state).toEqual({
      cases_last_run_at: '2026-05-01T00:00:00.000Z',
      activity_last_run_at: '2026-05-02T00:00:00.000Z',
      attachments_last_run_at: '2026-05-03T00:00:00.000Z',
    });
    // No surface threw, so this is a clean (if empty) tick — not an error.
    expect(taskRunError).toBeUndefined();
    // The mid-flight cancellation is logged exactly once, not per skipped surface.
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('reconciliation tick cancelled')
    );
  });

  it('runs cases, then skips activity + attachments when the signal trips after the cases surface', async () => {
    const controller = new AbortController();
    // Trip the signal as a side effect of the cases walk completing, so
    // the between-surface guards see `aborted` before activity runs.
    mockRunReconciliation.mockImplementation(async () => {
      controller.abort();
      return { newLastRunAt: 'CASES_NEW', processed: 1 };
    });
    const { run } = setupRun({
      signal: controller.signal,
      state: {
        cases_last_run_at: '2026-05-01T00:00:00.000Z',
        activity_last_run_at: '2026-05-02T00:00:00.000Z',
        attachments_last_run_at: '2026-05-03T00:00:00.000Z',
      },
    });

    const { state, taskRunError } = await run();

    // Cases completed and advanced its cursor...
    expect(mockRunReconciliation).toHaveBeenCalledTimes(1);
    // ...but the remaining surfaces were skipped by the abort guards.
    expect(mockRunActivityReconciliation).not.toHaveBeenCalled();
    expect(mockRunAttachmentsReconciliation).not.toHaveBeenCalled();
    expect(state).toEqual({
      cases_last_run_at: 'CASES_NEW',
      activity_last_run_at: '2026-05-02T00:00:00.000Z',
      attachments_last_run_at: '2026-05-03T00:00:00.000Z',
    });
    expect(taskRunError).toBeUndefined();
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('reconciliation tick cancelled')
    );
  });

  it('returns { state, taskRunError } (not a throw) when a surface throws mid-walk, preserving the other surfaces cursors', async () => {
    // Activity blows up mid-walk; cases + attachments succeed. The tick
    // must persist the successful cursors and report the failure via
    // taskRunError rather than throwing away nextState.
    mockRunActivityReconciliation.mockRejectedValue(new Error('activity boom'));
    const { run } = setupRun({
      state: { activity_last_run_at: '2026-05-02T00:00:00.000Z' },
    });

    const { state, taskRunError } = await run();

    // All three were attempted (no abort here).
    expect(mockRunReconciliation).toHaveBeenCalledTimes(1);
    expect(mockRunActivityReconciliation).toHaveBeenCalledTimes(1);
    expect(mockRunAttachmentsReconciliation).toHaveBeenCalledTimes(1);
    // Successful surfaces advanced; the failed surface's cursor stays pinned.
    expect(state).toEqual({
      cases_last_run_at: 'CASES_NEW',
      activity_last_run_at: '2026-05-02T00:00:00.000Z',
      attachments_last_run_at: 'ATTACHMENTS_NEW',
    });
    // Failure surfaced as taskRunError, naming the failing surface.
    expect(taskRunError).toBeDefined();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('activity reconciliation tick failed'),
      expect.objectContaining({ error: expect.any(Error) })
    );
  });
});
