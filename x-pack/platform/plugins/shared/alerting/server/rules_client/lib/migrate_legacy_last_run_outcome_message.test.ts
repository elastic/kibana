/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { migrateLegacyLastRunOutcomeMsg } from './migrate_legacy_last_run_outcome_message';

describe('migrateLegacyLastRunOutcomeMsg', () => {
  it('wraps a string outcomeMsg in an array', () => {
    const lastRun = { outcomeMsg: 'legacy message' as unknown };

    expect(migrateLegacyLastRunOutcomeMsg(lastRun)).toEqual({
      outcomeMsg: ['legacy message'],
    });
  });

  it('preserves other lastRun fields when wrapping a string outcomeMsg', () => {
    const lastRun = {
      outcome: 'succeeded' as const,
      outcomeMsg: 'only string' as unknown,
    };

    expect(migrateLegacyLastRunOutcomeMsg(lastRun)).toEqual({
      outcome: 'succeeded',
      outcomeMsg: ['only string'],
    });
  });

  it('returns lastRun unchanged when outcomeMsg is already a string array', () => {
    const lastRun = { outcomeMsg: ['a', 'b'] };

    expect(migrateLegacyLastRunOutcomeMsg(lastRun)).toBe(lastRun);
  });

  it('returns lastRun unchanged when outcomeMsg is undefined', () => {
    const lastRun = { outcome: 'failed' as const };

    // @ts-expect-error test with lastRun.outcomeMsg = undefined
    expect(migrateLegacyLastRunOutcomeMsg(lastRun)).toBe(lastRun);
  });

  it('returns lastRun unchanged when outcomeMsg is null', () => {
    const lastRun = { outcomeMsg: null };

    expect(migrateLegacyLastRunOutcomeMsg(lastRun)).toBe(lastRun);
  });

  it('returns lastRun unchanged when outcomeMsg is a non-string type', () => {
    const lastRun = { outcomeMsg: 42 as unknown };

    expect(migrateLegacyLastRunOutcomeMsg(lastRun)).toBe(lastRun);
  });
});
