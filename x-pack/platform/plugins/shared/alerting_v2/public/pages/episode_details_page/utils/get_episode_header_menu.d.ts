import type { AppHeaderMenu } from '@kbn/app-header';
import type { EpisodeAction } from '@kbn/alerting-v2-episodes-ui/actions';
import type { AlertEpisode } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
export interface EpisodeHeaderMenuArgs {
    actions: EpisodeAction[];
    episode: AlertEpisode | undefined;
    onSuccess: () => void;
}
export declare const getEpisodeHeaderMenu: ({ actions, episode, onSuccess, }: EpisodeHeaderMenuArgs) => AppHeaderMenu;
