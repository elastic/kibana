import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { AlertEpisode } from '../queries/episodes_query';
export interface UseFetchEpisodeQueryOptions {
    episodeId: string | undefined;
    services: {
        data: DataPublicPluginStart;
        spaces: SpacesPluginStart;
    };
}
/**
 * Loads the aggregated metadata row for a single episode.
 */
export declare const useFetchEpisodeQuery: ({ episodeId, services }: UseFetchEpisodeQueryOptions) => import("@tanstack/react-query").UseQueryResult<AlertEpisode | undefined, unknown>;
