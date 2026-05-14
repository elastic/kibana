/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { clampCursorToNotFuture } from '.';

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
