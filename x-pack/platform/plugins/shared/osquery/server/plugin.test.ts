/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildReconcileTaskSchedule } from './plugin';

describe('buildReconcileTaskSchedule (one-shot reconcile task registration)', () => {
  it('schedules the reconcile task as a one-shot run (runAt set, no recurring interval)', () => {
    const runAt = new Date('2026-06-25T00:00:00.000Z');
    const params = buildReconcileTaskSchedule(runAt);

    // One-shot: runAt drives a single prompt execution.
    expect(params.runAt).toBe(runAt);
    // No recurring schedule — the daily heartbeat is gone now that minting is
    // owned by the model version. Re-run pressure comes from Task Manager
    // maxAttempts + the state.completed self-mark + retry-on-hadFailures.
    expect(params).not.toHaveProperty('schedule');
  });

  it('keeps the persisted task-type id stable so existing scheduled tasks are not orphaned', () => {
    const params = buildReconcileTaskSchedule(new Date('2026-06-25T00:00:00.000Z'));

    expect(params.id).toBe('osquery:backfillScheduleIds');
    expect(params.taskType).toBe('osquery:backfillScheduleIds');
    expect(params.scope).toEqual(['osquery']);
  });
});
