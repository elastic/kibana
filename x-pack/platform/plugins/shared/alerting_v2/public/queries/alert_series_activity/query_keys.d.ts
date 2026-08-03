/**
 * React-query cache keys for the rule details overview tab. Owned by this
 * feature folder; the `@kbn/alerting-v2-episodes-ui` package owns its own
 * episode-scoped key namespace separately.
 */
export declare const ruleOverviewQueryKeys: {
    all: readonly ["alerting-v2", "rule-overview"];
    topNSeries: (ruleId: string, windowStartMs: number, windowEndMs: number) => readonly ["alerting-v2", "rule-overview", "top-n-series", string, number, number];
    episodeSelection: (ruleId: string, windowStartMs: number, windowEndMs: number, perLaneLimit: number, groupHashes: readonly string[]) => readonly ["alerting-v2", "rule-overview", "episode-selection", string, number, number, number, string[]];
    timelineSummary: (ruleId: string, windowStartMs: number, windowEndMs: number) => readonly ["alerting-v2", "rule-overview", "timeline-summary", string, number, number];
    episodePhases: (ruleId: string, windowStartMs: number, windowEndMs: number, episodeIds: readonly string[]) => readonly ["alerting-v2", "rule-overview", "episode-phases", string, number, number, string[]];
    episodeStarts: (ruleId: string, episodeIds: readonly string[]) => readonly ["alerting-v2", "rule-overview", "episode-starts", string, string[]];
    seriesGroupingValues: (ruleId: string, groupHashes: readonly string[], groupingFields: readonly string[]) => readonly ["alerting-v2", "rule-overview", "series-grouping-values", string, string[], string[]];
};
