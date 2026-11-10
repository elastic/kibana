/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mostActionableFailure, UnitStatsError } from './unit_stats_error';

describe('mostActionableFailure', () => {
  const forbidden = UnitStatsError.forbidden();
  const failed = UnitStatsError.queryFailed('destination stats');
  const timeout = UnitStatsError.timeout('processor stats');
  const unavailable = UnitStatsError.unavailable();

  it('prefers a failure a retry cannot fix over one it can', () => {
    expect(mostActionableFailure([unavailable, timeout, failed, forbidden])).toBe(forbidden);
    expect(mostActionableFailure([unavailable, timeout, failed])).toBe(failed);
    expect(mostActionableFailure([unavailable, timeout])).toBe(timeout);
  });

  it('returns the only failure', () => {
    expect(mostActionableFailure([unavailable])).toBe(unavailable);
  });
});
