import type { AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
export interface BuildEpisodeStartsQueryOptions {
    ruleId: string;
    /** The exact episodes being drawn (from {@link buildEpisodeSelectionQuery}). */
    episodeIds: string[];
}
/** Raw ES|QL row: the earliest `@timestamp` per `(episode.id, episode.status)`. */
export interface EpisodeStartRow {
    'episode.id': string;
    'episode.status': AlertEpisodeStatus;
    /** ISO timestamp — MIN(@timestamp) for this (episode, status) phase, across all time. */
    episode_start: string;
}
/**
 * Resolves each episode's true phase start, `MIN(@timestamp) BY episode.id,
 * episode.status`, scoped only by `rule.id` and the selected `episode.id`s.
 */
export declare const buildEpisodeStartsQuery: ({ ruleId, episodeIds }: BuildEpisodeStartsQueryOptions) => import("@elastic/esql").ComposerQuery;
