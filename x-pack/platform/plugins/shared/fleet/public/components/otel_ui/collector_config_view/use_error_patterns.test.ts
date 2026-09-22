/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildQuery, TIME_RANGE_TO_MS } from './use_error_patterns';

describe('buildQuery', () => {
  const now = 1_700_000_000_000; // fixed epoch ms for deterministic assertions
  const timeRangeMs = TIME_RANGE_TO_MS['1h'];
  const timeRangeGte = now - timeRangeMs;

  it('uses now - timeRangeMs as @timestamp.gte when enrolledAt is not provided', () => {
    const query = buildQuery('my-host', 'error', now, timeRangeMs);
    const range = getTimestampRange(query);
    expect(range.gte).toEqual(timeRangeGte);
    expect(range.lte).toEqual(now);
  });

  it('uses now - timeRangeMs as @timestamp.gte when enrolledAt is older than the time range', () => {
    const oldEnrolledAt = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(); // 1 week ago
    const query = buildQuery('my-host', 'error', now, timeRangeMs, oldEnrolledAt);
    const range = getTimestampRange(query);
    expect(range.gte).toEqual(timeRangeGte);
  });

  it('floors @timestamp.gte at enrolledAt when it is more recent than now - timeRangeMs', () => {
    const recentEnrolledAt = new Date(now - 30 * 60 * 1000).toISOString(); // 30 min ago, within 1h
    const enrolledAtMs = Date.parse(recentEnrolledAt);
    const query = buildQuery('my-host', 'error', now, timeRangeMs, recentEnrolledAt);
    const range = getTimestampRange(query);
    expect(range.gte).toEqual(enrolledAtMs);
    expect(range.gte).toBeGreaterThan(timeRangeGte);
  });

  it('uses now - timeRangeMs when enrolledAt is an invalid date string', () => {
    const query = buildQuery('my-host', 'error', now, timeRangeMs, 'not-a-date');
    const range = getTimestampRange(query);
    expect(range.gte).toEqual(timeRangeGte);
  });

  it('uses now - timeRangeMs when enrolledAt exactly equals now - timeRangeMs', () => {
    const exactBoundary = new Date(timeRangeGte).toISOString();
    const query = buildQuery('my-host', 'error', now, timeRangeMs, exactBoundary);
    const range = getTimestampRange(query);
    // enrolledAtMs === timeRangeGte, not strictly greater, so falls back
    expect(range.gte).toEqual(timeRangeGte);
  });

  it('filters by the provided serviceInstanceId', () => {
    const query = buildQuery('collector-abc', 'warning', now, timeRangeMs);
    const filter = query.params.body.query.bool.filter;
    expect(filter).toContainEqual({ term: { 'service.instance.id': 'collector-abc' } });
  });

  it('filters by error log levels for level=error', () => {
    const query = buildQuery('h', 'error', now, timeRangeMs);
    const filter = query.params.body.query.bool.filter;
    expect(filter).toContainEqual({
      terms: { 'log.level': ['error', 'ERROR', 'fatal', 'FATAL'] },
    });
  });

  it('filters by warning log levels for level=warning', () => {
    const query = buildQuery('h', 'warning', now, timeRangeMs);
    const filter = query.params.body.query.bool.filter;
    expect(filter).toContainEqual({
      terms: { 'log.level': ['warn', 'WARN', 'warning', 'WARNING'] },
    });
  });
});

function getTimestampRange(query: ReturnType<typeof buildQuery>) {
  const filter = query.params.body.query.bool.filter as Array<Record<string, unknown>>;
  const rangeClause = filter.find((f) => 'range' in f) as
    | { range: { '@timestamp': { gte: number; lte: number } } }
    | undefined;
  return rangeClause!.range['@timestamp'];
}
