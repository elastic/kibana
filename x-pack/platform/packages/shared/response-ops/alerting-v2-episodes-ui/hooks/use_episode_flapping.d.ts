import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { type FlappingSettings } from '../utils/is_episode_flapping';
export interface UseEpisodeFlappingOptions {
    episodeId: string | undefined;
    services: {
        data: DataPublicPluginStart;
        spaces: SpacesPluginStart;
    };
    settings?: FlappingSettings;
}
/**
 * Derives whether an episode is flapping from its most recent rule-event statuses.
 *
 * Uses {@link useFetchEpisodeFlappingQuery} (a dedicated newest-first query bounded
 * to the look-back window) rather than the unbounded oldest-first events query, so
 * the look-back reflects the genuinely latest events even for episodes with more
 * than ES|QL's implicit `LIMIT 1000` rows.
 */
export declare const useEpisodeFlapping: ({ episodeId, services, settings, }: UseEpisodeFlappingOptions) => {
    isFlapping: boolean;
    isLoading: boolean;
};
