/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildComponentQuery } from './use_component_metrics';

describe('buildComponentQuery', () => {
  const now = 1_700_000_000_000; // fixed epoch ms for deterministic assertions
  const timeRangeMs = 60 * 60 * 1000; // 1 hour
  const timeRangeGte = now - timeRangeMs;
  const fixedInterval = '1m';

  it('uses now - timeRangeMs as @timestamp.gte and now as lte when enrolledAt/offlineAt are not provided', () => {
    const query = buildComponentQuery(
      'my-host',
      'my-exporter',
      'exporter',
      now,
      timeRangeMs,
      fixedInterval
    );
    const range = getTimestampRange(query!);
    expect(range.gte).toEqual(timeRangeGte);
    expect(range.lte).toEqual(now);
  });

  it('uses now - timeRangeMs as @timestamp.gte when enrolledAt is older than the time range', () => {
    const oldEnrolledAt = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(); // 1 week ago
    const query = buildComponentQuery(
      'my-host',
      'my-exporter',
      'exporter',
      now,
      timeRangeMs,
      fixedInterval,
      oldEnrolledAt
    );
    const range = getTimestampRange(query!);
    expect(range.gte).toEqual(timeRangeGte);
  });

  it('floors @timestamp.gte at enrolledAt when it is more recent than now - timeRangeMs', () => {
    const recentEnrolledAt = new Date(now - 30 * 60 * 1000).toISOString(); // 30 min ago, within 1h
    const enrolledAtMs = Date.parse(recentEnrolledAt);
    const query = buildComponentQuery(
      'my-host',
      'my-exporter',
      'exporter',
      now,
      timeRangeMs,
      fixedInterval,
      recentEnrolledAt
    );
    const range = getTimestampRange(query!);
    expect(range.gte).toEqual(enrolledAtMs);
    expect(range.gte).toBeGreaterThan(timeRangeGte);
  });

  it('uses now - timeRangeMs when enrolledAt is an invalid date string', () => {
    const query = buildComponentQuery(
      'my-host',
      'my-exporter',
      'exporter',
      now,
      timeRangeMs,
      fixedInterval,
      'not-a-date'
    );
    const range = getTimestampRange(query!);
    expect(range.gte).toEqual(timeRangeGte);
  });

  it('caps @timestamp.lte at offlineAt when the collector is offline', () => {
    const offlineAt = new Date(now - 3 * 60 * 1000).toISOString(); // 3 min ago
    const offlineAtMs = Date.parse(offlineAt);
    const query = buildComponentQuery(
      'my-host',
      'my-exporter',
      'exporter',
      now,
      timeRangeMs,
      fixedInterval,
      undefined,
      offlineAt
    );
    const range = getTimestampRange(query!);
    expect(range.lte).toEqual(offlineAtMs);
    expect(range.lte).toBeLessThan(now);
  });

  it('uses now as lte when offlineAt is an invalid date string', () => {
    const query = buildComponentQuery(
      'my-host',
      'my-exporter',
      'exporter',
      now,
      timeRangeMs,
      fixedInterval,
      undefined,
      'not-a-date'
    );
    const range = getTimestampRange(query!);
    expect(range.lte).toEqual(now);
  });

  it('returns undefined for an unknown componentType', () => {
    const query = buildComponentQuery(
      'my-host',
      'my-ext',
      'extension' as any,
      now,
      timeRangeMs,
      fixedInterval
    );
    expect(query).toBeUndefined();
  });

  it('filters by the provided serviceInstanceId', () => {
    const query = buildComponentQuery(
      'collector-abc',
      'my-exporter',
      'exporter',
      now,
      timeRangeMs,
      fixedInterval
    );
    const filter = query!.params.body.query.bool.filter;
    expect(filter).toContainEqual({ term: { 'service.instance.id': 'collector-abc' } });
  });
});

function getTimestampRange(query: NonNullable<ReturnType<typeof buildComponentQuery>>) {
  const filter = query.params.body.query.bool.filter as Array<Record<string, unknown>>;
  const rangeClause = filter.find((f) => 'range' in f) as
    | { range: { '@timestamp': { gte: number; lte: number } } }
    | undefined;
  return rangeClause!.range['@timestamp'];
}
