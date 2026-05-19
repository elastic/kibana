import type { AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import type { EpisodeEventRow } from '../queries/episode_events_query';
/**
 * Last row by @timestamp order (caller should pass rows sorted ascending by time).
 */
export declare const getLastEpisodeStatus: (rows: EpisodeEventRow[]) => AlertEpisodeStatus | undefined;
export declare const getRuleIdFromEpisodeRows: (rows: EpisodeEventRow[]) => string | undefined;
/** ISO timestamp string of the first event where episode.status === 'active'. */
export declare const getTriggeredTimestamp: (rows: EpisodeEventRow[]) => string | undefined;
export declare const getGroupHashFromEpisodeRows: (rows: EpisodeEventRow[]) => string | undefined;
export declare const getEpisodeDurationMs: (rows: EpisodeEventRow[]) => number | undefined;
