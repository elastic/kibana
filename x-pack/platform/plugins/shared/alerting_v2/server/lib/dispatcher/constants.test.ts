/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DISPATCH_CHUNK_SIZE,
  MAX_WINDOW_MINUTES,
  OVERLAP_WINDOW_MINUTES,
  TICK_DEADLINE_MS,
} from './constants';
import { ESQL_QUERY_ROW_LIMIT } from './queries';

/** Parses a TM timeout string like '1m' or '30s' to milliseconds. */
const parseTimeoutMs = (timeout: string): number => {
  const match = timeout.match(/^(\d+)(m|s)$/);
  if (!match) throw new Error(`Unknown timeout format: ${timeout}`);
  const [, value, unit] = match;
  return Number(value) * (unit === 'm' ? 60_000 : 1_000);
};

describe('dispatcher constants invariants', () => {
  it('MAX_WINDOW_MINUTES is strictly greater than OVERLAP_WINDOW_MINUTES (forward-progress guarantee)', () => {
    expect(MAX_WINDOW_MINUTES).toBeGreaterThan(OVERLAP_WINDOW_MINUTES);
  });

  it('TICK_DEADLINE_MS is strictly below the task timeout so the watermark is always persisted', async () => {
    const { DISPATCHER_TASK_TIMEOUT } = await import('./constants');
    const taskTimeoutMs = parseTimeoutMs(DISPATCHER_TASK_TIMEOUT);
    expect(TICK_DEADLINE_MS).toBeLessThan(taskTimeoutMs);
  });

  it('DISPATCH_CHUNK_SIZE is 250', () => {
    expect(DISPATCH_CHUNK_SIZE).toBe(250);
  });

  it('ESQL_QUERY_ROW_LIMIT does not exceed the ES|QL maximum LIMIT of 10 000', () => {
    expect(ESQL_QUERY_ROW_LIMIT).toBeLessThanOrEqual(10_000);
  });
});
