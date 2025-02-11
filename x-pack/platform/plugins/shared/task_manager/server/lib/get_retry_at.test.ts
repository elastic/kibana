/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { calculateDelayBasedOnAttempts, getRetryDate } from './get_retry_at';
import { createRetryableError } from '../task_running';

let fakeTimer: sinon.SinonFakeTimers;

describe('calculateDelayBasedOnAttempts', () => {
  it('returns 30s on the first attempt', () => {
    expect(calculateDelayBasedOnAttempts(1)).toBe(30000);
  });

  it('returns delay with jitter', () => {
    const delay = calculateDelayBasedOnAttempts(5);
    // with jitter should be random between 0 and 40 min (inclusive)
    expect(delay).toBeGreaterThanOrEqual(0);
    expect(delay).toBeLessThanOrEqual(2400000);
  });

  it('returns delay capped at 1 hour', () => {
    const delay = calculateDelayBasedOnAttempts(10);
    // with jitter should be random between 0 and 1 hr (inclusive)
    expect(delay).toBeGreaterThanOrEqual(0);
    expect(delay).toBeLessThanOrEqual(60 * 60 * 1000);
  });
});

describe('getRetryDate', () => {
  beforeAll(() => {
    fakeTimer = sinon.useFakeTimers(new Date('2021-01-01T12:00:00.000Z'));
  });

  afterAll(() => fakeTimer.restore());

  it('returns retry date based on number of attempts if error is not retryable', () => {
    expect(getRetryDate({ error: new Error('foo'), attempts: 1 })).toEqual(
      new Date('2021-01-01T12:00:30.000Z')
    );
  });

  it('returns retry date based on number of attempts and add duration if error is not retryable', () => {
    expect(getRetryDate({ error: new Error('foo'), attempts: 1, addDuration: '5m' })).toEqual(
      new Date('2021-01-01T12:05:30.000Z')
    );
  });

  it('returns retry date for retryable error with retry date', () => {
    expect(
      getRetryDate({
        error: createRetryableError(new Error('foo'), new Date('2021-02-01T12:00:00.000Z')),
        attempts: 1,
      })
    ).toEqual(new Date('2021-02-01T12:00:00.000Z'));
  });

  it('returns retry date based on number of attempts for retryable error with retry=true', () => {
    expect(
      getRetryDate({
        error: createRetryableError(new Error('foo'), true),
        attempts: 1,
      })
    ).toEqual(new Date('2021-01-01T12:00:30.000Z'));
  });

  it('returns retry date based on number of attempts and add duration for retryable error with retry=true', () => {
    expect(
      getRetryDate({
        error: createRetryableError(new Error('foo'), true),
        attempts: 1,
        addDuration: '5m',
      })
    ).toEqual(new Date('2021-01-01T12:05:30.000Z'));
  });

  it('returns undefined for retryable error with retry=false', () => {
    expect(
      getRetryDate({
        error: createRetryableError(new Error('foo'), false),
        attempts: 1,
      })
    ).toBeUndefined();
  });
});
