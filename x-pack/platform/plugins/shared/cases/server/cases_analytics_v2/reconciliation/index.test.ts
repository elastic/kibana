/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { clampCursorToNotFuture, resetReconciliationTask, RECONCILIATION_TASK_ID } from '.';

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
   * FAILURE SCENARIO: Future cursor freezes incremental reconciliation
   * Symptom: Cases stop appearing in analytics for an unbounded window;
   *          no errors logged, just silent staleness until wall time
   *          catches up to the bad cursor.
   * Log signature: `cases-analyticsV2: persisted reconciliation cursor is in the future`
   * Trigger: Clock skew between Kibana nodes, or manual SO tampering with
   *          task state.
   * Recovery: Self-heals on the next tick — clamp returns `undefined` so
   *           the next run does a full backfill, then resumes incremental.
   */
  it('returns undefined and warns when the cursor is in the future', () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    expect(clampCursorToNotFuture(future, logger)).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('persisted reconciliation cursor is in the future')
    );
  });

  /**
   * FAILURE SCENARIO: Corrupted cursor crashes the task on Date.parse
   * Symptom: Without the clamp, an unparseable timestamp would be passed
   *          straight into the KQL filter and silently match nothing,
   *          freezing reconciliation just like the future-cursor case.
   * Log signature: `cases-analyticsV2: persisted reconciliation cursor is unparseable`
   * Trigger: SO state corruption (e.g., manual edit, partial write).
   * Recovery: Self-heals — falls back to a full backfill on the next tick.
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
    // ensureScheduled guarantees a task SO is on disk for bulkUpdateState
    // to write into. The previous implementation called remove() instead,
    // which had a silent failure path when the task SO couldn't be
    // deleted for non-404 reasons.
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
   * FAILURE SCENARIO: After `/reset`, the next periodic reconciliation
   *                   tick inherits a stale cursor.
   * Symptom: `/reset` returns 200, the index is dropped and recreated,
   *          but cases the user has not since patched stay invisible in
   *          the data view forever. The fire-and-forget write hook fires
   *          on subsequent updates (those show up); reconciliation does
   *          run, but it walks `updated_at > stale_cursor`, which
   *          excludes every case the user hasn't touched since the
   *          stale cursor was captured.
   * Log signature: none on the happy path; the previous implementation
   *                emitted a single WARN when `remove()` failed but did
   *                not abort.
   * Trigger: The previous `resetReconciliationTask` used
   *          `taskManager.remove` + `ensureScheduled`. If `remove` failed
   *          for any reason other than 404 (cluster blip, locked SO,
   *          transient ES error) the SO survived; `ensureScheduled` then
   *          no-oped because the SO still existed, so the persisted
   *          state — including the stale cursor — was kept intact.
   * Recovery: Use `bulkUpdateState` to atomically force-rewrite state.
   *           It does not depend on `remove` succeeding, and writes the
   *           new state regardless of whether the SO already existed.
   */
  it('force-rewrites task state via bulkUpdateState (no remove dependency)', async () => {
    const tm = taskManagerMock.createStart();

    await resetReconciliationTask({
      taskManager: tm,
      logger,
      intervalMinutes: 30,
      initialState: { last_run_at: '2026-05-14T20:00:00.000Z' },
    });

    // remove() is not called at all — the broken flow's failure path is
    // unreachable now.
    expect(tm.remove).not.toHaveBeenCalled();
    expect(tm.bulkUpdateState).toHaveBeenCalledTimes(1);
    const [ids, mapFn] = (tm.bulkUpdateState as jest.Mock).mock.calls[0];
    expect(ids).toEqual([RECONCILIATION_TASK_ID]);
    // The map function is called with the (irrelevant) prior state and
    // returns the initialState we passed in. Pin the contract so a future
    // refactor that "preserves" old fields can't silently undo the reset.
    expect(typeof mapFn).toBe('function');
    expect(mapFn({ last_run_at: 'stale-cursor', other: 'field' }, RECONCILIATION_TASK_ID)).toEqual({
      last_run_at: '2026-05-14T20:00:00.000Z',
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
    expect(mapFn({ last_run_at: 'anything' }, RECONCILIATION_TASK_ID)).toEqual({});
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
});
