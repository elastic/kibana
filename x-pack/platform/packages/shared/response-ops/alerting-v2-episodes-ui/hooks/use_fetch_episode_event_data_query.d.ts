import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
export interface UseFetchEpisodeEventDataQueryOptions {
    episodeId: string | undefined;
    services: {
        data: DataPublicPluginStart;
        spaces: SpacesPluginStart;
    };
}
export interface EpisodeEventData {
    /** Parsed `data` object from the latest non-empty event. */
    data: Record<string, unknown>;
    /** Timestamp of the event that produced `data`. */
    dataTimestamp: string;
    /**
     * `true` when the latest event for the episode does not carry `data`
     * (e.g. an inactive/recovery event), so the displayed `data` is older
     * than the most recent event.
     */
    isStale: boolean;
}
/**
 * Fetches the alert `data` object from the latest non-empty event for an episode,
 * along with the timestamp of that event and a flag indicating whether a more
 * recent event without data exists. Returns `null` when no event with non-empty
 * data is available yet.
 */
export declare const useFetchEpisodeEventDataQuery: ({ episodeId, services, }: UseFetchEpisodeEventDataQueryOptions) => import("@kbn/react-query").UseQueryResult<EpisodeEventData | null, unknown>;
