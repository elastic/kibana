import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { type AlertEpisodeAction } from '../queries/episode_actions_query';
export interface FetchEpisodeActionsOptions {
    episodeIds: string[];
    abortSignal?: AbortSignal;
    expressions: ExpressionsStart;
}
/**
 * Executes an ES|QL query to fetch latest acknowledge action and assignee by episode.
 */
export declare const fetchEpisodeActions: ({ episodeIds, abortSignal, expressions, }: FetchEpisodeActionsOptions) => Promise<AlertEpisodeAction[]>;
