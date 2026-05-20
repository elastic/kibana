import React from 'react';
import type { AlertEpisode } from '../queries/episodes_query';
import type { EpisodeAction } from '../actions/types';
export interface EpisodeActionsBarProps {
    /** Already filtered to compatible. Bar does not re-filter. */
    actions: EpisodeAction[];
    episodes: AlertEpisode[];
    onSuccess?: () => void;
}
export declare const EpisodeActionsBar: ({ actions, episodes, onSuccess }: EpisodeActionsBarProps) => React.JSX.Element;
