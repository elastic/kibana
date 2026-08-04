export interface TopNSeriesRow {
    group_hash: string;
}
export interface BuildTopNSeriesQueryOptions {
    ruleId: string;
    windowStartMs: number;
    windowEndMs: number;
}
/**
 * Returns the `group_hash`es of the most-recently-active series in the window,
 * capped to the number of lanes the chart renders
 * (`SORT last_event_ts DESC | LIMIT ALERT_TIMELINE_TOP_N_DEFAULT`) — there's no
 * value in pulling more series than are shown.
 */
export declare const buildTopNSeriesQuery: ({ ruleId, windowStartMs, windowEndMs, }: BuildTopNSeriesQueryOptions) => import("@elastic/esql").ComposerQuery;
