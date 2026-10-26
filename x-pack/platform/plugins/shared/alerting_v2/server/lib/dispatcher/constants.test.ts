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
  getTickDeadlineMs,
} from './constants';
import { parseDurationToMs } from '../duration';
import { ESQL_QUERY_ROW_LIMIT } from './queries';

describe('dispatcher constants invariants', () => {
  it('MAX_WINDOW_MINUTES is strictly greater than OVERLAP_WINDOW_MINUTES (forward-progress guarantee)', () => {
    expect(MAX_WINDOW_MINUTES).toBeGreaterThan(OVERLAP_WINDOW_MINUTES);
  });

  it.each(['1m', '3m', '5m'])(
    'getTickDeadlineMs(%s) is 70 %% of the task timeout, strictly below it',
    (timeout) => {
      const timeoutMs = parseDurationToMs(timeout);
      expect(getTickDeadlineMs(timeout)).toBe(Math.round(timeoutMs * 0.7));
      expect(getTickDeadlineMs(timeout)).toBeLessThan(timeoutMs);
    }
  );

  it('DISPATCH_CHUNK_SIZE is 250', () => {
    expect(DISPATCH_CHUNK_SIZE).toBe(250);
  });

  it('ESQL_QUERY_ROW_LIMIT does not exceed the ES|QL maximum LIMIT of 10 000', () => {
    expect(ESQL_QUERY_ROW_LIMIT).toBeLessThanOrEqual(10_000);
  });
});
