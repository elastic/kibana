import type { Datatable } from '@kbn/expressions-plugin/common';
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
export declare const computeBucketInterval: (startMs: number, endMs: number) => string;
export declare const intervalToMs: (interval: string) => number;
/** Generates non-overlapping buckets aligned to interval boundaries covering [startMs, endMs]. */
export declare const generateTimeBuckets: (startMs: number, endMs: number, interval: string) => TimeBucket[];
/**
 * For each bucket, counts episodes whose [first_timestamp, last_timestamp] overlaps with
 * [bucket.start, bucket.end]. Active episodes (status = 'active') have no recovery event yet —
 * their effective end is capped at nowMs (defaults to Date.now()) so they don't bleed into
 * future buckets when the selected time range extends beyond the current moment.
 * When breakdownField is provided, produces one entry per (bucket, breakdown value) pair.
 */
export declare const computeOverlapCounts: (episodes: HistogramEpisodeRow[], buckets: TimeBucket[], breakdownField?: string, nowMs?: number) => HistogramBucketCount[];
/** Formats overlap counts as a Lens-compatible Datatable for @kbn/unified-histogram. */
export declare const formatHistogramDatatable: (buckets: HistogramBucketCount[], breakdownField?: string) => Datatable;
