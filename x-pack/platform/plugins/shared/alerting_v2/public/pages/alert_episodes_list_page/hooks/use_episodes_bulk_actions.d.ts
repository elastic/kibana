import type { CustomBulkActions } from '@kbn/unified-data-table';
import type { AlertEpisode } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import type { EpisodeAction } from '@kbn/alerting-v2-episodes-ui/actions';
interface UseEpisodesBulkActionsParams {
    actions: EpisodeAction[];
    episodesData: AlertEpisode[] | undefined;
    onSuccess: () => void;
}
export declare const useEpisodesBulkActions: ({ actions, episodesData, onSuccess, }: UseEpisodesBulkActionsParams) => CustomBulkActions;
export {};
