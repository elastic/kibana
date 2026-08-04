import React from 'react';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { EpisodeActionHistoryEntry } from '../../../queries/episode_actions_history_query';
export interface AlertEpisodeTimelineActionCommentProps {
    entry: EpisodeActionHistoryEntry;
    profilesMap: Map<string, UserProfileWithAvatar>;
}
export declare const AlertEpisodeTimelineActionComment: ({ entry, profilesMap, }: AlertEpisodeTimelineActionCommentProps) => React.JSX.Element;
