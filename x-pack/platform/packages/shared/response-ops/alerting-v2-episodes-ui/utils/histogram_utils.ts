/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import type { Datatable, DatatableColumn, DatatableRow } from '@kbn/expressions-plugin/common';
import {
  HISTOGRAM_MAX_BREAKDOWN_SERIES,
  HISTOGRAM_MAX_BUCKETS,
  HISTOGRAM_OTHER_BREAKDOWN,
} from '../constants';

export interface TimeBucket {
  start: number;
  end: number;
}

export interface HistogramEpisodeRow {
  first_timestamp: string;
  last_timestamp: string;
  'episode.status': string;
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

export const intervalToMs = (interval: string): number => {
  // Accepts both numeric prefixed ('1h', '6h') and bare single-letter ('h', 'd') formats.
  // The unified-histogram interval selector emits bare letters; our own computeBucketInterval
  // emits numeric-prefixed strings. Both forms must be handled.
  const match = interval.match(/^(\d*)([smhdwMy])$/);
  if (!match) return 3_600_000; // unknown format: fall back to 1 h
  const n = match[1] ? parseInt(match[1], 10) : 1;
  return moment.duration(n, match[2] as moment.unitOfTime.DurationConstructor).asMilliseconds();
};

/**
 * Returns `interval` unchanged when it yields at most `maxBuckets` buckets over [startMs, endMs];
 * otherwise returns the smallest multiple of the same unit that fits.
 */
export const clampBucketInterval = (
  startMs: number,
  endMs: number,
  interval: string,
  maxBuckets: number = HISTOGRAM_MAX_BUCKETS
): string => {
  const ratio = (endMs - startMs) / intervalToMs(interval) / maxBuckets;
  if (ratio <= 1) return interval;

  const match = interval.match(/^(\d*)([smhdwMy])$/);
  if (!match) return interval;
  const [, count, unit] = match;
  const n = count ? parseInt(count, 10) : 1;
  return `${n * Math.ceil(ratio)}${unit}`;
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

const toBreakdownValue = (episode: HistogramEpisodeRow, breakdownField: string): string =>
  String(episode[breakdownField] ?? 'unknown');

/**
 * For each bucket, counts episodes whose [first_timestamp, last_timestamp] overlaps with
 * [bucket.start, bucket.end]. Active episodes (status = 'active') have no recovery event yet —
 * their effective end is capped at nowMs (defaults to Date.now()) so they don't bleed into
 * future buckets when the selected time range extends beyond the current moment.
 * When breakdownField is provided, produces one entry per (bucket, breakdown value) pair.
 */
export const computeOverlapCounts = (
  episodes: HistogramEpisodeRow[],
  buckets: TimeBucket[],
  breakdownField?: string,
  nowMs: number = Date.now()
): HistogramBucketCount[] => {
  const parsed = episodes.map((ep) => ({
    ep,
    firstMs: new Date(ep.first_timestamp).getTime(),
    lastMs: ep['episode.status'] === 'active' ? nowMs : new Date(ep.last_timestamp).getTime(),
  }));

  return buckets.flatMap(({ start, end }) => {
    const overlapping = parsed.filter(({ firstMs, lastMs }) => firstMs < end && lastMs > start);

    if (!breakdownField) {
      return [{ bucketStart: start, count: overlapping.length }];
    }

    const counts = new Map<string, number>();
    for (const { ep } of overlapping) {
      const key = toBreakdownValue(ep, breakdownField);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].map(([breakdown, count]) => ({
      bucketStart: start,
      count,
      breakdown,
    }));
  });
};

/** Sums bucket counts sharing the same (bucketStart, breakdown) pair across sources. */
export const mergeBucketCounts = (...sources: HistogramBucketCount[][]): HistogramBucketCount[] => {
  const merged = new Map<string, HistogramBucketCount>();
  for (const { bucketStart, count, breakdown } of sources.flat()) {
    const key = `${bucketStart}::${breakdown ?? ''}`;
    const existing = merged.get(key);
    if (existing) {
      existing.count += count;
    } else {
      merged.set(key, { bucketStart, count, ...(breakdown !== undefined ? { breakdown } : {}) });
    }
  }
  return [...merged.values()];
};

/** Counts episodes per breakdown value, the ranking used by `limitBreakdownSeries`. */
export const countEpisodesByBreakdown = (
  episodes: HistogramEpisodeRow[],
  breakdownField: string
): Record<string, number> => {
  const totals: Record<string, number> = {};
  for (const episode of episodes) {
    const value = toBreakdownValue(episode, breakdownField);
    totals[value] = (totals[value] ?? 0) + 1;
  }
  return totals;
};

/** Sums per-breakdown-value totals across sources. */
export const sumBreakdownTotals = (
  ...sources: Array<Record<string, number>>
): Record<string, number> => {
  const totals: Record<string, number> = {};
  for (const source of sources) {
    for (const [value, total] of Object.entries(source)) {
      totals[value] = (totals[value] ?? 0) + total;
    }
  }
  return totals;
};

/** Code-unit order, matching how Elasticsearch `terms` breaks count ties (`_key` ascending). */
const compareValues = (a: string, b: string): number => {
  if (a === b) return 0;
  return a < b ? -1 : 1;
};

/**
 * Keeps the `limit` breakdown values with the highest totals as their own series and folds every
 * other value, including counts a source already folded, into one `HISTOGRAM_OTHER_BREAKDOWN`
 * series. Bucket totals are unchanged.
 */
export const limitBreakdownSeries = (
  counts: HistogramBucketCount[],
  totals: Record<string, number>,
  limit: number = HISTOGRAM_MAX_BREAKDOWN_SERIES
): HistogramBucketCount[] => {
  const kept = new Set(
    Object.entries(totals)
      .filter(([value]) => value !== HISTOGRAM_OTHER_BREAKDOWN)
      .sort(([a, aTotal], [b, bTotal]) => bTotal - aTotal || compareValues(a, b))
      .slice(0, limit)
      .map(([value]) => value)
  );
  return mergeBucketCounts(
    counts.map((count) =>
      count.breakdown === undefined || kept.has(count.breakdown)
        ? count
        : { ...count, breakdown: HISTOGRAM_OTHER_BREAKDOWN }
    )
  );
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
