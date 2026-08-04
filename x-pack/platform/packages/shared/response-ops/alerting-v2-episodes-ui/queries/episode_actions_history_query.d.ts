export interface EpisodeActionHistoryEntry {
    _id: string;
    '@timestamp': string;
    action_type: string;
    actor: string | null;
    episode_id: string | null;
    group_hash: string | null;
    tags: string[] | null;
    assignee_uid: string | null;
    expiry: string | null;
    reason: string | null;
}
export declare const DEFAULT_ACTIONS_HISTORY_PAGE_SIZE = 25;
export interface BuildEpisodeActionsHistoryQueryOptions {
    /** Keyset cursor: only return records at or before this timestamp (exclusive on refetch, see hook dedup). */
    before?: string;
    /** Page size. Defaults to {@link DEFAULT_ACTIONS_HISTORY_PAGE_SIZE}. */
    limit?: number;
}
/**
 * Returns individual action records for an episode (both episode-level and group-level),
 * sorted newest-first, one keyset page at a time. Non-aggregating counterpart to
 * buildEpisodeActionsQuery. `_id` is projected via `METADATA _id` so callers can dedup records
 * that straddle a page boundary (the `before` cursor is inclusive to avoid dropping same-timestamp
 * records split across pages).
 */
export declare const buildEpisodeActionsHistoryQuery: (spaceId: string, episodeId: string, groupHash: string, { before, limit }?: BuildEpisodeActionsHistoryQueryOptions) => import("@elastic/esql").ComposerQuery;
