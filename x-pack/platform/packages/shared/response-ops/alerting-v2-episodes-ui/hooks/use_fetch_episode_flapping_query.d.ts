import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { type EpisodeFlappingRow } from '../queries/episode_flapping_query';
export interface UseFetchEpisodeFlappingQueryOptions {
    episodeId: string | undefined;
    services: {
        data: DataPublicPluginStart;
        spaces: SpacesPluginStart;
    };
}
/**
 * Loads the most recent `.rule-events` statuses for an episode, bounded to the
 * default flapping look-back window.
 *
 * The underlying query sorts `@timestamp` DESC with an explicit LIMIT; rows are
 * reversed here so callers receive them in chronological (oldest-first) order.
 */
export declare const useFetchEpisodeFlappingQuery: ({ episodeId, services, }: UseFetchEpisodeFlappingQueryOptions) => import("@tanstack/react-query").UseQueryResult<EpisodeFlappingRow[], unknown>;
