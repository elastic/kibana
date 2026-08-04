import type { AppHeaderBadge } from '@kbn/app-header';
import { type AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import type { EpisodeActionState, AlertEpisodeGroupAction } from '@kbn/alerting-v2-episodes-ui/types/action';
export interface EpisodeHeaderBadgesArgs {
    status: AlertEpisodeStatus | undefined;
    severity: string | undefined | null;
    episodeAction: EpisodeActionState | undefined;
    groupAction: AlertEpisodeGroupAction | undefined;
    isFlapping?: boolean;
}
export declare const getEpisodeHeaderBadges: ({ status, severity, episodeAction, groupAction, isFlapping, }: EpisodeHeaderBadgesArgs) => AppHeaderBadge[];
