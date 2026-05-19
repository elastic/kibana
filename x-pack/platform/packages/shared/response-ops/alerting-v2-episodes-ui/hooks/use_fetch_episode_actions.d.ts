import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { EpisodeActionState } from '../types/action';
export interface UseFetchEpisodeActionsOptions {
    episodeIds: string[];
    expressions: ExpressionsStart;
}
export declare const useFetchEpisodeActions: ({ episodeIds, expressions, }: UseFetchEpisodeActionsOptions) => import("@kbn/react-query").UseQueryResult<Map<string, EpisodeActionState>, unknown>;
