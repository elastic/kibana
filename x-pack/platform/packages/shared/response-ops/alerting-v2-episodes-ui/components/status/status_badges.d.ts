import React from 'react';
import { type AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import type { EpisodeActionState, AlertEpisodeGroupAction } from '../../types/action';
export interface AlertEpisodeStatusBadgesProps {
    status: AlertEpisodeStatus;
    episodeAction?: EpisodeActionState;
    groupAction?: AlertEpisodeGroupAction;
}
export declare function AlertEpisodeStatusBadges({ status, episodeAction, groupAction, }: AlertEpisodeStatusBadgesProps): React.JSX.Element;
