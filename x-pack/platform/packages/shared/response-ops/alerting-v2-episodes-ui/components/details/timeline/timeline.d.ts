import React from 'react';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { TimelineEntry } from './entries';
export interface AlertEpisodeTimelineProps {
    entries: TimelineEntry[];
    profilesMap: Map<string, UserProfileWithAvatar>;
    onLoadMore?: () => void;
    hasMore?: boolean;
    isLoadingMore?: boolean;
}
export declare const AlertEpisodeTimeline: ({ entries, profilesMap, onLoadMore, hasMore, isLoadingMore, }: AlertEpisodeTimelineProps) => React.JSX.Element;
