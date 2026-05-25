/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable, DatatableColumn, DatatableRow } from '@kbn/expressions-plugin/common';

export interface TimeBucket {
  start: number;
  end: number;
}

export interface HistogramEpisodeRow {
  first_timestamp: string;
  last_timestamp: string;
  'episode.status': string;
  effective_status?: string;
  [key: string]: unknown;
}

export interface HistogramBucketCount {
  bucketStart: number;
  count: number;
  breakdown?: string;
}

/** Returns a reasonable bucket interval for the given time range (epoch ms). */
export const computeBucketInterval = (startMs: number, endMs: number): string => {
  const ms = endMs - startMs;
  if (ms <= 3_600_000) return '1m';
  if (ms <= 86_400_000) return '1h';
  if (ms <= 604_800_000) return '6h';
  if (ms <= 2_592_000_000) return '1d';
  return '1w';
};

const intervalToMs = (interval: string): number => {
  // Accepts both numeric prefixed ('1h', '6h') and bare single-letter ('h', 'd') formats.
  // The unified-histogram interval selector emits bare letters; our own computeBucketInterval
  // emits numeric-prefixed strings. Both forms must be handled.
  const match = interval.match(/^(\d*)([smhdwMy])$/);
  if (!match) return 3_600_000; // unknown format: fall back to 1 h
  const n = match[1] ? parseInt(match[1], 10) : 1;
  switch (match[2]) {
    case 's':
      return n * 1_000;
    case 'm':
      return n * 60_000;
    case 'h':
      return n * 3_600_000;
    case 'd':
      return n * 86_400_000;
    case 'w':
      return n * 604_800_000;
    case 'M':
      return n * 30 * 86_400_000;
    case 'y':
      return n * 365 * 86_400_000;
    default:
      return 3_600_000; // fallback
  }
};

/** Generates non-overlapping buckets aligned to interval boundaries covering [startMs, endMs]. */
export const generateTimeBuckets = (
  startMs: number,
  endMs: number,
  interval: string
): TimeBucket[] => {
  // Guard against inverted or zero-width ranges — silently return empty to simplify callers.
  if (startMs >= endMs) return [];
  const ms = intervalToMs(interval);
  const buckets: TimeBucket[] = [];
  let s = Math.floor(startMs / ms) * ms;
  while (s < endMs) {
    buckets.push({ start: s, end: s + ms });
    s += ms;
  }
  return buckets;
};

/**
 * For each bucket, counts episodes whose [first_timestamp, last_timestamp] overlaps with
 * [bucket.start, bucket.end]. Active episodes (status = 'active') have no end — treated
 * as ongoing.
 * When breakdownField is provided, produces one entry per (bucket, breakdown value) pair.
 */
export const computeOverlapCounts = (
  episodes: HistogramEpisodeRow[],
  buckets: TimeBucket[],
  breakdownField?: string
): HistogramBucketCount[] => {
  const result: HistogramBucketCount[] = [];

  for (const bucket of buckets) {
    const overlapping = episodes.filter((ep) => {
      const firstMs = new Date(ep.first_timestamp).getTime();
      const lastMs =
        ep['episode.status'] === 'active' ? Infinity : new Date(ep.last_timestamp).getTime();
      return firstMs < bucket.end && lastMs > bucket.start;
    });

    if (!breakdownField) {
      result.push({ bucketStart: bucket.start, count: overlapping.length });
    } else {
      const byBreakdown = new Map<string, number>();
      for (const ep of overlapping) {
        const key = String(ep[breakdownField] ?? 'unknown');
        byBreakdown.set(key, (byBreakdown.get(key) ?? 0) + 1);
      }
      if (byBreakdown.size === 0) {
        result.push({ bucketStart: bucket.start, count: 0 });
      } else {
        for (const [breakdown, count] of byBreakdown) {
          result.push({ bucketStart: bucket.start, count, breakdown });
        }
      }
    }
  }

  return result;
};

/** Formats overlap counts as a Lens-compatible Datatable for @kbn/unified-histogram. */
export const formatHistogramDatatable = (
  buckets: HistogramBucketCount[],
  breakdownField?: string
): Datatable => {
  const breakdownColumn: DatatableColumn[] = breakdownField
    ? [{ id: breakdownField, name: breakdownField, meta: { type: 'string' } }]
    : [];
  const columns: DatatableColumn[] = [
    { id: 'time_bucket', name: 'time_bucket', meta: { type: 'date' } },
    ...breakdownColumn,
    { id: 'count', name: 'Count', meta: { type: 'number' } },
  ];

  const rows: DatatableRow[] = buckets.map((b) => ({
    time_bucket: new Date(b.bucketStart).toISOString(),
    ...(breakdownField ? { [breakdownField]: b.breakdown ?? null } : {}),
    count: b.count,
  }));

  return { type: 'datatable', columns, rows };
};
