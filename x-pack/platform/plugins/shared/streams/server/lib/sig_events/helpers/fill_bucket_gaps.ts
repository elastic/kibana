/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MAX_FILL_BUCKETS = 10_000;

// Short-form unit character → ES|QL long-form name (for `BUCKET(@timestamp, N <unit>)`).
// Millisecond conversions live in `MS_PER_UNIT` (`@kbn/streams-schema`).
export const ESQL_UNITS: Record<string, string> = {
  s: 'seconds',
  m: 'minutes',
  h: 'hours',
  d: 'days',
};

// Parses bucket-size strings like `"1m"`, `"5s"`, `"2h"`, `"3d"`.
export function parseBucketSize(raw: string): { value: number; unit: string } {
  const match = raw.match(/^(\d+)([smhd])$/);
  // 60s (1 minute) is the smallest granularity that produces readable sparklines
  // while remaining efficient. Invalid inputs are caught upstream by the API schema.
  if (!match) return { value: 60, unit: 's' };
  const value = parseInt(match[1], 10);
  if (value < 1) return { value: 60, unit: 's' };
  return { value, unit: match[2] };
}

/**
 * Fills gaps in a sparse occurrence series so every bucket in `[from, to]` has
 * an entry. ES|QL `STATS … BY BUCKET(…)` omits empty buckets; DSL
 * `date_histogram` with `extended_bounds` would not. Sparklines need the full
 * continuous series.
 */
export function fillBucketGaps(
  sparse: Array<{ date: string; count: number }>,
  from: Date,
  to: Date,
  intervalMs: number
): Array<{ date: string; count: number }> {
  const existingBuckets = new Map(sparse.map((o) => [new Date(o.date).getTime(), o.count]));

  const result: Array<{ date: string; count: number }> = [];
  let current = Math.floor(from.getTime() / intervalMs) * intervalMs;
  const endMs = to.getTime();

  while (current <= endMs && result.length < MAX_FILL_BUCKETS) {
    result.push({
      date: new Date(current).toISOString(),
      count: existingBuckets.get(current) ?? 0,
    });
    current += intervalMs;
  }

  return result;
}
