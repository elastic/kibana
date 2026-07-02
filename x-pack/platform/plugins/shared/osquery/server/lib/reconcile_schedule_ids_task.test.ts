/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import {
  RECONCILE_TASK_TYPE,
  RECONCILE_RETRY_DELAY_MS,
  RECONCILE_RETRY_MAX_DELAY_MS,
  buildReconcileTaskSchedule,
  buildReconcileRunResult,
  computeBackoffDelayMs,
  scheduleReconcileTask,
} from './reconcile_schedule_ids_task';

describe('buildReconcileTaskSchedule (one-shot reconcile task registration)', () => {
  it('schedules the reconcile task as a one-shot run (runAt set, no recurring interval)', () => {
    const runAt = new Date('2026-06-25T00:00:00.000Z');
    const params = buildReconcileTaskSchedule(runAt);

    expect(params.runAt).toBe(runAt);
    expect(params).not.toHaveProperty('schedule');
  });

  it('keeps the persisted task-type id stable so existing scheduled tasks are not orphaned', () => {
    const params = buildReconcileTaskSchedule(new Date('2026-06-25T00:00:00.000Z'));

    expect(params.id).toBe(RECONCILE_TASK_TYPE);
    expect(params.taskType).toBe(RECONCILE_TASK_TYPE);
    expect(RECONCILE_TASK_TYPE).toBe('osquery:backfillScheduleIds');
    expect(params.scope).toEqual(['osquery']);
  });
});

describe('computeBackoffDelayMs (capped exponential backoff)', () => {
  it('returns the base delay for the first failure (0 prior attempts)', () => {
    expect(computeBackoffDelayMs(0)).toBe(RECONCILE_RETRY_DELAY_MS);
  });

  it('doubles per prior attempt', () => {
    expect(computeBackoffDelayMs(1)).toBe(RECONCILE_RETRY_DELAY_MS * 2);
    expect(computeBackoffDelayMs(2)).toBe(RECONCILE_RETRY_DELAY_MS * 4);
    expect(computeBackoffDelayMs(3)).toBe(RECONCILE_RETRY_DELAY_MS * 8);
  });

  it('never exceeds the 24h cap', () => {
    expect(computeBackoffDelayMs(100)).toBe(RECONCILE_RETRY_MAX_DELAY_MS);
    for (let attempts = 0; attempts <= 200; attempts++) {
      expect(computeBackoffDelayMs(attempts)).toBeLessThanOrEqual(RECONCILE_RETRY_MAX_DELAY_MS);
    }
  });
});

describe('buildReconcileRunResult (single-run re-arm + backoff contract)', () => {
  const now = new Date('2026-06-25T00:00:00.000Z');

  it('marks the task completed and clears the attempt counter on a clean pass', () => {
    expect(buildReconcileRunResult(false, now)).toEqual({
      state: { completed: true, retryAttempts: 0 },
    });
  });

  it('resets the attempt counter even after prior failures on a clean pass', () => {
    expect(buildReconcileRunResult(false, now, { completed: false, retryAttempts: 5 })).toEqual({
      state: { completed: true, retryAttempts: 0 },
    });
  });

  it('first failure (no prior state) re-arms at the base 5m delay and records one attempt', () => {
    const result = buildReconcileRunResult(true, now);

    expect(result.state).toEqual({ completed: false, retryAttempts: 1 });
    expect((result.runAt as Date).getTime()).toBe(now.getTime() + RECONCILE_RETRY_DELAY_MS);
  });

  it('consecutive failures double the delay and increment the attempt counter', () => {
    const second = buildReconcileRunResult(true, now, { completed: false, retryAttempts: 1 });
    expect(second.state).toEqual({ completed: false, retryAttempts: 2 });
    expect((second.runAt as Date).getTime()).toBe(now.getTime() + RECONCILE_RETRY_DELAY_MS * 2);

    const third = buildReconcileRunResult(true, now, { completed: false, retryAttempts: 2 });
    expect(third.state).toEqual({ completed: false, retryAttempts: 3 });
    expect((third.runAt as Date).getTime()).toBe(now.getTime() + RECONCILE_RETRY_DELAY_MS * 4);
  });

  it('caps the re-arm delay at 24h no matter how many prior attempts', () => {
    const result = buildReconcileRunResult(true, now, { completed: false, retryAttempts: 50 });

    expect((result.runAt as Date).getTime()).toBe(now.getTime() + RECONCILE_RETRY_MAX_DELAY_MS);
    expect(result.state.retryAttempts).toBe(51);
  });
});

describe('scheduleReconcileTask (conditional-remove startup contract)', () => {
  const now = new Date('2026-06-25T00:00:00.000Z');
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  it('upgraded deployment (legacy recurring doc) → removes it then schedules a fresh one-shot', async () => {
    const taskManager = taskManagerMock.createStart();
    const callOrder: string[] = [];
    taskManager.get.mockResolvedValue({
      id: RECONCILE_TASK_TYPE,
      schedule: { interval: '1d' },
    } as never);
    taskManager.removeIfExists.mockImplementation(async () => {
      callOrder.push('removeIfExists');
    });
    taskManager.ensureScheduled.mockImplementation(async () => {
      callOrder.push('ensureScheduled');

      return buildReconcileTaskSchedule(now) as never;
    });

    await scheduleReconcileTask(taskManager, logger, now);

    expect(callOrder).toEqual(['removeIfExists', 'ensureScheduled']);
    expect(taskManager.removeIfExists).toHaveBeenCalledWith(RECONCILE_TASK_TYPE);
    const scheduled = taskManager.ensureScheduled.mock.calls[0][0];
    expect(scheduled.runAt).toBe(now);
    expect(scheduled).not.toHaveProperty('schedule');
  });

  it('live one-shot doc (no recurring schedule) → does NOT remove; ensureScheduled no-ops', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.get.mockResolvedValue({ id: RECONCILE_TASK_TYPE, runAt: now } as never);

    await scheduleReconcileTask(taskManager, logger, now);

    expect(taskManager.removeIfExists).not.toHaveBeenCalled();
    expect(taskManager.ensureScheduled).toHaveBeenCalledWith(buildReconcileTaskSchedule(now));
  });

  it('fresh install (no existing doc / 404) → schedules without removing', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.get.mockRejectedValue(new Error('Saved object [task/...] not found'));

    await scheduleReconcileTask(taskManager, logger, now);

    expect(taskManager.removeIfExists).not.toHaveBeenCalled();
    const scheduled = taskManager.ensureScheduled.mock.calls[0][0];
    expect(scheduled.runAt).toBe(now);
    expect(scheduled).not.toHaveProperty('schedule');
  });

  it('catches a rejected removeIfExists and logs a warning instead of throwing', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.get.mockResolvedValue({
      id: RECONCILE_TASK_TYPE,
      schedule: { interval: '1d' },
    } as never);
    taskManager.removeIfExists.mockRejectedValue(new Error('boom'));

    await expect(scheduleReconcileTask(taskManager, logger, now)).resolves.toBeUndefined();

    expect(taskManager.ensureScheduled).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to schedule reconcileScheduleIdsToWire task: boom')
    );
  });

  it('catches a rejected ensureScheduled and logs a warning instead of throwing', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.get.mockResolvedValue({ id: RECONCILE_TASK_TYPE, runAt: now } as never);
    taskManager.ensureScheduled.mockRejectedValue(new Error('boom'));

    await expect(scheduleReconcileTask(taskManager, logger, now)).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to schedule reconcileScheduleIdsToWire task: boom')
    );
  });

  it('is a no-op when taskManager is undefined', async () => {
    await expect(scheduleReconcileTask(undefined, logger, now)).resolves.toBeUndefined();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
