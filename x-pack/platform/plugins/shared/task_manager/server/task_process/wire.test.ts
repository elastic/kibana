/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRetryableError, isRetryableError } from '../task_running/errors';
import { deserializeRunResult, reviveTaskInstance, serializeRunResult } from './wire';

describe('task process wire format', () => {
  it('round trips a run result with its dates and errors through JSON', () => {
    const runAt = new Date('2030-01-01T00:00:00.000Z');
    const retryAt = new Date('2030-02-01T00:00:00.000Z');
    const result = {
      state: { a: 1 },
      runAt,
      error: createRetryableError(new Error('later'), retryAt),
    };
    const revived = deserializeRunResult(JSON.parse(JSON.stringify(serializeRunResult(result))));
    expect(revived?.runAt).toEqual(runAt);
    expect(revived?.state).toEqual({ a: 1 });
    const error = (revived as { error: Error }).error;
    expect(error.message).toBe('later');
    expect(isRetryableError(error)).toEqual(retryAt);
  });

  it('keeps a schedule and flags', () => {
    const result = { state: {}, schedule: { interval: '1m' }, shouldDeleteTask: true };
    expect(deserializeRunResult(JSON.parse(JSON.stringify(serializeRunResult(result))))).toEqual(
      result
    );
  });

  it('returns nothing for a run with no result', () => {
    expect(serializeRunResult(undefined)).toBeUndefined();
    expect(deserializeRunResult(undefined)).toBeUndefined();
  });

  it('turns the dates of a task instance back into dates', () => {
    const revived = reviveTaskInstance({
      id: 't',
      scheduledAt: '2030-01-01T00:00:00.000Z',
      runAt: '2030-01-02T00:00:00.000Z',
      retryAt: null,
    });
    expect(revived.scheduledAt).toEqual(new Date('2030-01-01T00:00:00.000Z'));
    expect(revived.runAt).toEqual(new Date('2030-01-02T00:00:00.000Z'));
    expect(revived.retryAt).toBeNull();
  });
});
