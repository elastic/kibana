import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
export interface UseFetchEpisodeTrendQueryOptions {
    episodeId: string | undefined;
    /** Metric labels to project from each event's `data`; one series per label. */
    metricLabels: string[];
    services: {
        data: DataPublicPluginStart;
        spaces: SpacesPluginStart;
    };
}
/**
 * Loads an episode's `.rule-events` rows (oldest first) carrying the lifecycle
 * status and, for each requested metric label, the value the rule evaluated for that
 * execution — the source for both the trend lines and the state-transition annotations.
 */
export declare const useFetchEpisodeTrendQuery: ({ episodeId, metricLabels, services, }: UseFetchEpisodeTrendQueryOptions) => import("@tanstack/react-query").UseQueryResult<import("../queries/episode_trend_query").EpisodeTrendRow[], unknown>;
