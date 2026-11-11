/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  capAtMaxLogsPerWindow,
  LOG_EXTRACTION_SAMPLE_MIN_RETAINED,
  pickSampleProbability,
} from './effective_page_limits';

describe('capAtMaxLogsPerWindow', () => {
  it('caps value to maxLogsPerWindow when the window cap is active', () => {
    expect(capAtMaxLogsPerWindow(50000, 1000)).toBe(1000);
  });

  it('leaves value unchanged when value is already below maxLogsPerWindow', () => {
    expect(capAtMaxLogsPerWindow(500, 1000)).toBe(500);
  });

  it('leaves value unchanged when maxLogsPerWindow is 0 (disabled)', () => {
    expect(capAtMaxLogsPerWindow(50000, 0)).toBe(50000);
  });
});

describe('pickSampleProbability', () => {
  it('uses the target probability (0.1) at the default page size, where minRetained/M is small', () => {
    expect(pickSampleProbability(50000)).toBeCloseTo(0.1);
  });

  it('escalates p above the target as maxLogsPerPage shrinks', () => {
    expect(pickSampleProbability(10000)).toBeCloseTo(0.25); // 2500/10000
    expect(pickSampleProbability(5000)).toBeCloseTo(0.5); // 2500/5000
  });

  it('floors at p=1 (an exact, unsampled probe) once maxLogsPerPage <= minRetained', () => {
    expect(pickSampleProbability(2500)).toBe(1);
    expect(pickSampleProbability(1000)).toBe(1);
    expect(pickSampleProbability(20)).toBe(1);
    expect(pickSampleProbability(1)).toBe(1);
  });

  it('never goes below targetProbability, even for very large maxLogsPerPage', () => {
    expect(pickSampleProbability(10_000_000)).toBeCloseTo(0.1);
  });

  it('respects a custom targetProbability and minRetained', () => {
    expect(pickSampleProbability(10000, 0.2, 1000)).toBeCloseTo(0.2); // 1000/10000=0.1 < target 0.2
    expect(pickSampleProbability(2000, 0.2, 1000)).toBeCloseTo(0.5); // 1000/2000=0.5 > target 0.2
  });

  it('exposes LOG_EXTRACTION_SAMPLE_MIN_RETAINED as the documented threshold', () => {
    expect(LOG_EXTRACTION_SAMPLE_MIN_RETAINED).toBe(2500);
    expect(pickSampleProbability(LOG_EXTRACTION_SAMPLE_MIN_RETAINED)).toBe(1);
    expect(pickSampleProbability(LOG_EXTRACTION_SAMPLE_MIN_RETAINED + 1)).toBeLessThan(1);
  });

  it('rounds the result to 4 decimal places instead of returning a long floating-point literal', () => {
    // 2500 / 3000 = 0.8333333333333334 unrounded — embedding that raw value in an ES|QL SAMPLE
    // clause would be unstable/unreadable, so pickSampleProbability bounds it up front.
    expect(pickSampleProbability(3000)).toBe(0.8333);
  });
});
