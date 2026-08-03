import React from 'react';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { EpisodeActionHistoryEntry } from '../../../queries/episode_actions_history_query';
export interface AlertEpisodeTimelineActionEventProps {
    entry: EpisodeActionHistoryEntry;
    assigneeProfile: UserProfileWithAvatar | undefined;
}
/** Renders the sentence-flow event line for an action entry (verb + inline details). */
export declare const AlertEpisodeTimelineActionEvent: ({ entry, assigneeProfile, }: AlertEpisodeTimelineActionEventProps) => React.JSX.Element;
