import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { type EpisodeEventRow } from '../queries/episode_events_query';
export interface UseFetchEpisodeEventsQueryOptions {
    episodeId: string | undefined;
    services: {
        data: DataPublicPluginStart;
        spaces: SpacesPluginStart;
    };
}
/**
 * Loads all `.rule-events` rows for an episode (sorted ascending by @timestamp).
 */
export declare const useFetchEpisodeEventsQuery: ({ episodeId, services, }: UseFetchEpisodeEventsQueryOptions) => import("@kbn/react-query").UseQueryResult<EpisodeEventRow[], unknown>;
