/** A single firing-frequency histogram bucket returned by the ES|QL query. */
export interface SignalFiringsBucketRow {
    ts: string;
    count: number;
}
/** Single-row aggregate carrying the exact timestamp of the most recent firing. */
export interface SignalFiringsSummaryRow {
    last_firing: string | null;
}
/**
 * Bucket intervals produced by `computeBucketInterval`, mapped to their ES|QL
 * time-duration span literals. A closed set, so the literal can be injected
 * directly into the query (no injection surface).
 */
export declare const BUCKET_INTERVAL_TO_ESQL_SPAN: Record<string, string>;
export interface BuildSignalFiringsQueryOptions {
    ruleId: string;
    gteMs: number;
    lteMs: number;
    /** Bucket interval from `computeBucketInterval` (e.g. `'1h'`). */
    interval: string;
}
export interface BuildSignalFiringsSummaryQueryOptions {
    ruleId: string;
    gteMs: number;
    lteMs: number;
}
/**
 * Firing-frequency histogram: counts signal-rule firings into time buckets.
 * Signal firings are point events (`type == "signal"`), so a plain
 * `COUNT(*) BY BUCKET(...)` is exact — no overlap counting needed.
 */
export declare const buildSignalFiringsHistogramQuery: ({ ruleId, gteMs, lteMs, interval, }: BuildSignalFiringsQueryOptions) => import("@elastic/esql").ComposerQuery;
/**
 * Exact timestamp of the most recent firing in the window. Kept separate from
 * the bucketed query because a bucket boundary would be off by up to a bucket
 * width on coarse windows.
 */
export declare const buildSignalFiringsSummaryQuery: ({ ruleId, gteMs, lteMs, }: BuildSignalFiringsSummaryQueryOptions) => import("@elastic/esql").ComposerQuery;
