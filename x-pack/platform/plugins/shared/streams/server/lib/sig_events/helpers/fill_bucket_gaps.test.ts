/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BUCKET_SIZE_PATTERN,
  ESQL_UNITS,
  MAX_FILL_BUCKETS,
  fillBucketGaps,
  parseBucketSize,
} from './fill_bucket_gaps';

describe('parseBucketSize', () => {
  it('parses seconds', () => {
    expect(parseBucketSize('30s')).toEqual({ value: 30, unit: 's' });
  });

  it('parses minutes', () => {
    expect(parseBucketSize('1m')).toEqual({ value: 1, unit: 'm' });
    expect(parseBucketSize('5m')).toEqual({ value: 5, unit: 'm' });
  });

  it('parses hours', () => {
    expect(parseBucketSize('2h')).toEqual({ value: 2, unit: 'h' });
  });

  it('parses days', () => {
    expect(parseBucketSize('1d')).toEqual({ value: 1, unit: 'd' });
  });

  it('falls back to 60s for unrecognised input', () => {
    expect(parseBucketSize('invalid')).toEqual({ value: 60, unit: 's' });
    expect(parseBucketSize('')).toEqual({ value: 60, unit: 's' });
    expect(parseBucketSize('1x')).toEqual({ value: 60, unit: 's' });
  });

  it('falls back to 60s when value is zero', () => {
    expect(parseBucketSize('0m')).toEqual({ value: 60, unit: 's' });
  });
});

describe('BUCKET_SIZE_PATTERN', () => {
  it.each(['1s', '30s', '1m', '5m', '2h', '1d', '24h', '1440m'])('accepts %s', (input) => {
    expect(BUCKET_SIZE_PATTERN.test(input)).toBe(true);
  });

  it.each(['', '1', 'm', '1ms', '5min', '1minute', '1.5m', '1 m', ' 1m', '1m ', '1x', 'abc'])(
    'rejects %j',
    (input) => {
      expect(BUCKET_SIZE_PATTERN.test(input)).toBe(false);
    }
  );
});

describe('ESQL_UNITS', () => {
  it('maps all four unit characters to ES|QL time-duration names', () => {
    expect(ESQL_UNITS.s).toBe('seconds');
    expect(ESQL_UNITS.m).toBe('minutes');
    expect(ESQL_UNITS.h).toBe('hours');
    expect(ESQL_UNITS.d).toBe('days');
  });
});

describe('fillBucketGaps', () => {
  const ONE_MINUTE_MS = 60_000;
  const ONE_HOUR_MS = 60 * ONE_MINUTE_MS;

  // Utility: creates a Date at an exact epoch-aligned 1-minute boundary
  const minuteAgo = (offsetMinutes: number, base: Date) =>
    new Date(base.getTime() + offsetMinutes * ONE_MINUTE_MS);

  it('returns an entry for every minute in [from, to] when sparse input is empty', () => {
    const from = new Date('2026-01-01T00:00:00.000Z');
    const to = new Date('2026-01-01T00:04:00.000Z');
    const { buckets: result, truncated } = fillBucketGaps([], from, to, ONE_MINUTE_MS);

    expect(truncated).toBe(false);
    expect(result).toHaveLength(5); // 00:00, 00:01, 00:02, 00:03, 00:04
    expect(result.every((r) => r.count === 0)).toBe(true);
    expect(result[0].date).toBe('2026-01-01T00:00:00.000Z');
    expect(result[4].date).toBe('2026-01-01T00:04:00.000Z');
  });

  it('preserves counts for existing buckets and fills zeros for missing ones', () => {
    const base = new Date('2026-01-01T00:00:00.000Z');
    const from = base;
    const to = minuteAgo(4, base);

    // Only minutes 0 and 3 have docs
    const sparse = [
      { date: base.toISOString(), count: 2 },
      { date: minuteAgo(3, base).toISOString(), count: 1 },
    ];

    const { buckets: result } = fillBucketGaps(sparse, from, to, ONE_MINUTE_MS);

    expect(result).toHaveLength(5);
    expect(result[0].count).toBe(2); // minute 0 — has docs
    expect(result[1].count).toBe(0); // minute 1 — gap
    expect(result[2].count).toBe(0); // minute 2 — gap
    expect(result[3].count).toBe(1); // minute 3 — has docs
    expect(result[4].count).toBe(0); // minute 4 — gap
  });

  it('aligns buckets to epoch-aligned boundaries (floor-anchored)', () => {
    // from is 30 seconds into the minute — should align DOWN to the minute floor
    const from = new Date('2026-01-01T00:00:30.000Z');
    const to = new Date('2026-01-01T00:01:30.000Z');

    const { buckets: result } = fillBucketGaps([], from, to, ONE_MINUTE_MS);

    // Floor of 00:00:30 → 00:00:00; also covers 00:01:00
    expect(result[0].date).toBe('2026-01-01T00:00:00.000Z');
    expect(result[1].date).toBe('2026-01-01T00:01:00.000Z');
  });

  it('handles hourly intervals', () => {
    const from = new Date('2026-01-01T00:00:00.000Z');
    const to = new Date('2026-01-01T02:00:00.000Z');
    const { buckets: result } = fillBucketGaps([], from, to, ONE_HOUR_MS);

    expect(result).toHaveLength(3); // 00:00, 01:00, 02:00
    expect(result[2].date).toBe('2026-01-01T02:00:00.000Z');
  });

  it('produces parity with DSL date_histogram output for multiple rules sharing a window', () => {
    // 10-minute window, 1-minute buckets, two rules with overlapping but distinct firing patterns.
    // rule-A: docs at minutes 0, 3, 3, 7 → sparse { 0→1, 3→2, 7→1 }
    const base = new Date('2026-01-01T00:00:00.000Z');
    const from = base;
    const to = minuteAgo(10, base); // 10 minutes later (inclusive)

    const sparseRuleA = [
      { date: base.toISOString(), count: 1 },
      { date: minuteAgo(3, base).toISOString(), count: 2 },
      { date: minuteAgo(7, base).toISOString(), count: 1 },
    ];

    const { buckets: resultA } = fillBucketGaps(sparseRuleA, from, to, ONE_MINUTE_MS);

    expect(resultA).toHaveLength(11); // minutes 0–10 inclusive
    expect(resultA[0].count).toBe(1);
    expect(resultA[1].count).toBe(0);
    expect(resultA[2].count).toBe(0);
    expect(resultA[3].count).toBe(2);
    expect(resultA[7].count).toBe(1);
    expect(resultA[10].count).toBe(0);

    // rule-B: docs at minutes 0 and 9
    const sparseRuleB = [
      { date: base.toISOString(), count: 1 },
      { date: minuteAgo(9, base).toISOString(), count: 1 },
    ];
    const { buckets: resultB } = fillBucketGaps(sparseRuleB, from, to, ONE_MINUTE_MS);

    expect(resultB).toHaveLength(11);
    expect(resultB[0].count).toBe(1);
    expect(resultB[9].count).toBe(1);
    // All other buckets are zero
    const gapBuckets = resultB.filter((_, i) => i !== 0 && i !== 9);
    expect(gapBuckets.every((r) => r.count === 0)).toBe(true);
  });

  it('caps the result at MAX_FILL_BUCKETS and sets truncated when the range exceeds the guardrail', () => {
    const from = new Date('2026-01-01T00:00:00.000Z');
    const to = new Date(from.getTime() + (MAX_FILL_BUCKETS + 1) * ONE_MINUTE_MS);
    const { buckets, truncated } = fillBucketGaps([], from, to, ONE_MINUTE_MS);

    expect(buckets).toHaveLength(MAX_FILL_BUCKETS);
    expect(truncated).toBe(true);
  });
});
