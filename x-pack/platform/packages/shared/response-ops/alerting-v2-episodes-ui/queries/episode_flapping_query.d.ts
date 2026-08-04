import type { AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
export interface EpisodeFlappingRow {
    'episode.status': AlertEpisodeStatus;
}
/**
 * ES|QL query returning the most recent `limit` rule-event statuses for a single
 * episode, newest first. Callers reverse the rows to restore chronological order.
 *
 * Unlike the shared oldest-first {@link buildEpisodeEventsEsqlQuery}, this sorts
 * `@timestamp` DESC with an explicit LIMIT so the flapping look-back always
 * reflects the genuinely latest events. Reusing the unbounded ascending query
 * would hit ES|QL's implicit `LIMIT 1000` and return the oldest 1000 rows for
 * long-running episodes, making the "most recent" look-back window stale.
 */
export declare const buildEpisodeFlappingEsqlQuery: (spaceId: string, episodeId: string, limit?: number) => import("@elastic/esql").ComposerQuery;
