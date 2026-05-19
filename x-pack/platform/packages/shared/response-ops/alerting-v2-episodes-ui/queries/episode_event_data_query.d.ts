export interface EpisodeEventDataRow {
    'episode.id': string;
    last_data: string | null;
    last_data_timestamp: string | null;
    last_event_timestamp: string | null;
}
/**
 * ES|QL query that extracts the alert `data` object from the latest non-empty
 * `.rule-events` document for the given episode, alongside the timestamp of
 * that data event and the timestamp of the most recent event overall.
 *
 * Uses `METADATA _source` so `JSON_EXTRACT` can access the full document source.
 * `INLINE STATS LAST(...) WHERE extracted_data != "{}"` skips status-only events
 * (e.g. inactive/recovered) whose `data` field is empty, returning the last event
 * that carried actual alert evaluation data. `last_event_timestamp` (no WHERE)
 * lets callers detect when the displayed data is stale relative to the latest
 * event (e.g. after recovery).
 */
export declare const buildEpisodeEventDataQuery: (episodeId: string) => import("@elastic/esql").ComposerQuery;
