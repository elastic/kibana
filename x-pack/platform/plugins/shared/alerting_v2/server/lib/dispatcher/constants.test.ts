/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_WINDOW_MINUTES, OVERLAP_WINDOW_MINUTES, TICK_DEADLINE_MS } from './constants';
import { EPISODE_QUERY_LIMIT } from './queries';

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

  it('EPISODE_QUERY_LIMIT matches the LIMIT literal in getDispatchableAlertEventsQuery', async () => {
    // Dynamically import to keep the assertion co-located without a cross-file import cycle.
    const { getDispatchableAlertEventsQuery } = await import('./queries');
    const { query } = getDispatchableAlertEventsQuery({
      gte: '2026-01-22T07:20:00.000Z',
      lte: '2026-01-22T07:35:00.000Z',
    });

    expect(query).toContain(`LIMIT ${EPISODE_QUERY_LIMIT}`);
  });
});
