/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SEVERITY_OPTIONS } from '@kbn/significant-events-schema';
import { SEVERITY_RANK, severityRank } from './severity_rank';

describe('severityRank', () => {
  it('keeps SEVERITY_OPTIONS ordered most-severe first so positional ranks stay stable', () => {
    expect([...SEVERITY_OPTIONS]).toEqual(['80-critical', '60-high', '40-medium', '20-low']);
  });

  it('assigns lower rank indexes to higher severity tiers', () => {
    expect(severityRank('80-critical')).toBe(0);
    expect(severityRank('60-high')).toBe(1);
    expect(severityRank('40-medium')).toBe(2);
    expect(severityRank('20-low')).toBe(3);
    expect(SEVERITY_RANK.size).toBe(SEVERITY_OPTIONS.length);
  });

  it('returns undefined for unknown tiers', () => {
    expect(severityRank(undefined)).toBeUndefined();
    expect(severityRank('not-a-tier')).toBeUndefined();
  });
});
