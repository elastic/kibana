import type { AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
export interface EpisodeEventRow {
    '@timestamp': string;
    'episode.id': string;
    'episode.status': AlertEpisodeStatus;
    'rule.id': string;
    group_hash: string;
}
/**
 * ES|QL query returning all events for a single alert episode, oldest first.
 */
export declare const buildEpisodeEventsEsqlQuery: (episodeId: string) => import("@elastic/esql").ComposerQuery;
