import React from 'react';
import { type AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import type { EpisodeActionState, EpisodeStatusGroupAction } from '../../types/action';
export interface AlertEpisodeStatusBadgesProps {
    status: AlertEpisodeStatus;
    episodeAction?: EpisodeActionState;
    groupAction?: EpisodeStatusGroupAction;
    isFlapping?: boolean;
}
export declare function AlertEpisodeStatusBadges({ status, episodeAction, groupAction, isFlapping, }: AlertEpisodeStatusBadgesProps): React.JSX.Element;
