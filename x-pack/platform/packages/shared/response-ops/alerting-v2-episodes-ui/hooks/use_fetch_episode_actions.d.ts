import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { EpisodeActionState } from '../types/action';
export interface UseFetchEpisodeActionsOptions {
    episodeIds: string[];
    services: {
        expressions: ExpressionsStart;
        spaces: SpacesPluginStart;
    };
}
export declare const useFetchEpisodeActions: ({ episodeIds, services }: UseFetchEpisodeActionsOptions) => import("@kbn/react-query").UseQueryResult<Map<string, EpisodeActionState>, unknown>;
