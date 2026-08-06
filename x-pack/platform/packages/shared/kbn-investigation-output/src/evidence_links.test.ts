/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEvidenceDiscoverParams } from './evidence_links';

describe('buildEvidenceDiscoverParams', () => {
  const timeRange = { from: '2026-07-28T13:30:00Z', to: '2026-07-28T15:00:00Z' };

  it('builds ES|QL params from a query and its window', () => {
    expect(
      buildEvidenceDiscoverParams({
        description: 'Pool utilization saturates at 14:02.',
        esql_query: 'FROM metrics-* | STATS max = MAX(pool.utilization)',
        time_range: timeRange,
      })
    ).toEqual({
      query: { esql: 'FROM metrics-* | STATS max = MAX(pool.utilization)' },
      timeRange: { from: '2026-07-28T13:30:00Z', to: '2026-07-28T15:00:00Z' },
      interval: 'auto',
    });
  });

  it('returns undefined when the query has no time range, so the reader is never sent to an unbounded window', () => {
    expect(
      buildEvidenceDiscoverParams({
        description: 'Pool utilization saturates at 14:02.',
        esql_query: 'FROM metrics-* | STATS max = MAX(pool.utilization)',
      })
    ).toBeUndefined();
  });

  it('returns undefined when there is no query to open', () => {
    expect(
      buildEvidenceDiscoverParams({
        description: 'All checkout pods were in CrashLoopBackOff.',
        time_range: timeRange,
      })
    ).toBeUndefined();
  });

  it.each([
    ['datemath', { from: 'now-1h', to: 'now' }],
    ['a malformed bound', { from: 'yesterday afternoon', to: '2026-07-28T15:00:00Z' }],
    ['a reversed range', { from: '2026-07-28T15:00:00Z', to: '2026-07-28T13:30:00Z' }],
    ['an empty range', { from: '2026-07-28T15:00:00Z', to: '2026-07-28T15:00:00Z' }],
  ])('returns undefined for %s, which would frame the wrong window', (_label, window) => {
    expect(
      buildEvidenceDiscoverParams({
        description: 'Pool utilization saturates at 14:02.',
        esql_query: 'FROM metrics-* | STATS max = MAX(pool.utilization)',
        time_range: window,
      })
    ).toBeUndefined();
  });
});
