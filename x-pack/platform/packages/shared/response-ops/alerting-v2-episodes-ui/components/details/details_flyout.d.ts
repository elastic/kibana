import React from 'react';
import type { EpisodeAction } from '../../actions/types';
import type { AlertEpisodeDetailsServices } from './types';
export interface AlertEpisodeDetailsFlyoutProps {
    episodeId: string;
    groupHash: string | undefined;
    onClose: () => void;
    services: AlertEpisodeDetailsServices;
    actions?: EpisodeAction[];
}
export declare const AlertEpisodeDetailsFlyout: ({ episodeId, groupHash, onClose, services, actions, }: AlertEpisodeDetailsFlyoutProps) => React.JSX.Element;
