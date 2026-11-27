/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEsqlBucketSpan, getEsqlColumnFunctions } from './esql_stats_columns';

describe('getEsqlColumnFunctions', () => {
  it('maps each STATS column to the ML functions for its aggregation', () => {
    expect(
      getEsqlColumnFunctions(
        'FROM logs | STATS a = AVG(bytes), s = sum(bytes), mx = MAX(bytes), mn = MIN(bytes), md = MEDIAN(bytes), event_count = COUNT(*) BY t = BUCKET(@timestamp, 1 hour), host'
      )
    ).toEqual({
      a: ['mean', 'high_mean', 'low_mean'],
      s: ['sum', 'high_sum', 'low_sum'],
      mx: ['max'],
      mn: ['min'],
      md: ['median', 'high_median', 'low_median'],
      event_count: [],
      t: [],
      host: [],
    });
  });

  it('uses the last STATS command', () => {
    expect(
      getEsqlColumnFunctions(
        'FROM logs | STATS n = COUNT(*) BY host, t = BUCKET(@timestamp, 1 hour) | STATS m = MAX(n) BY t'
      )
    ).toEqual({ m: ['max'], t: [] });
  });

  it('returns no limits for queries without STATS or with syntax errors', () => {
    expect(getEsqlColumnFunctions('FROM logs | KEEP @timestamp, bytes')).toEqual({});
    expect(getEsqlColumnFunctions('FROM logs | STATS a = AVG(bytes) BY')).toEqual({});
  });
});

describe('getEsqlBucketSpan', () => {
  const query = (interval: string, func = 'BUCKET(@timestamp, ') =>
    `FROM logs | STATS c = COUNT(*) BY timestamp = ${func}${interval}), host`;

  it.each([
    ['1 h', '1h'],
    ['1h', '1h'],
    ['15 minutes', '15m'],
    ['15 m', '15m'],
    ['15m', '15m'],
    ['15 min', '15m'],
    ['30 seconds', '30s'],
    ['500 ms', '500ms'],
    ['2 days', '2d'],
    ['1 week', '7d'],
    ['"1 hour"', '1h'],
  ])('converts BUCKET interval %s to %s', (interval, bucketSpan) => {
    expect(getEsqlBucketSpan(query(interval), 'timestamp')).toBe(bucketSpan);
  });

  it('reads TBUCKET', () => {
    expect(getEsqlBucketSpan(query('1 hour', 'TBUCKET('), 'timestamp')).toBe('1h');
  });

  it('returns null for intervals without a fixed length', () => {
    expect(getEsqlBucketSpan(query('1 month'), 'timestamp')).toBeNull();
    expect(getEsqlBucketSpan(query('1 year'), 'timestamp')).toBeNull();
    expect(getEsqlBucketSpan(query('20, "2024-01-01", "2024-02-01"'), 'timestamp')).toBeNull();
  });

  it('only uses the grouping of the time field', () => {
    expect(getEsqlBucketSpan(query('1 hour'), '@timestamp')).toBeNull();
    expect(getEsqlBucketSpan('FROM logs | KEEP @timestamp, bytes', '@timestamp')).toBeNull();
    expect(
      getEsqlBucketSpan('FROM logs | STATS c = COUNT(*) BY timestamp = ROUND(bytes)', 'timestamp')
    ).toBeNull();
  });
});
