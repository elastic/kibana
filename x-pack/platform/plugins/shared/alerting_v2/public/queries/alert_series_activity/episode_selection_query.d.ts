/**
 * Selects the episodes the alert timeline draws, scoped to the chosen top-N
 * series. One row per episode (its series + most-recent activity in the window).
 * `LIMIT ... BY group_hash` gives each series its own episode budget, so a busy
 * series can't crowd out quieter ones. Start/phases come from {@link buildEpisodePhasesQuery}.
 */
export interface EpisodeSelectionRow {
    'episode.id': string;
    group_hash: string;
    last_ts: string;
}
/** Per-series cap on episodes drawn. A render-density limit (each episode is ~4 phase rows), so it can be generous. */
export declare const MAX_EPISODES_PER_LANE = 50;
export interface BuildEpisodeSelectionQueryOptions {
    ruleId: string;
    windowStartMs: number;
    windowEndMs: number;
    /** Series (lanes) to restrict selection to — the chosen top-N `group_hash`es. */
    groupHashes: string[];
    /** Max episodes kept per series. Defaults to {@link MAX_EPISODES_PER_LANE}. */
    perLaneLimit?: number;
}
export declare const buildEpisodeSelectionQuery: ({ ruleId, windowStartMs, windowEndMs, groupHashes, perLaneLimit, }: BuildEpisodeSelectionQueryOptions) => import("@elastic/esql").ComposerQuery;
