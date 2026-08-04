import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { type EpisodeActionHistoryEntry } from '../queries/episode_actions_history_query';
export interface UseFetchEpisodeActionsHistoryQueryOptions {
    episodeId: string | undefined;
    groupHash: string | undefined;
    services: {
        data: DataPublicPluginStart;
        spaces: SpacesPluginStart;
    };
    /** Page size for each keyset fetch. Defaults to {@link DEFAULT_ACTIONS_HISTORY_PAGE_SIZE}. */
    pageSize?: number;
}
/**
 * Loads an episode's action history newest-first, one keyset page at a time. Pages are cursored
 * by the oldest `@timestamp` of the previous page (`WHERE @timestamp <= cursor`), so records that
 * land exactly on the boundary can be re-fetched — they're deduped here by `_id`.
 */
export declare const useFetchEpisodeActionsHistoryQuery: ({ episodeId, groupHash, services, pageSize, }: UseFetchEpisodeActionsHistoryQueryOptions) => {
    entries: EpisodeActionHistoryEntry[];
    isLoading: boolean;
    isError: boolean;
    fetchNextPage: (options?: import("@tanstack/query-core").FetchNextPageOptions) => Promise<import("@tanstack/query-core").InfiniteQueryObserverResult<EpisodeActionHistoryEntry[], unknown>>;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
};
