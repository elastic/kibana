import React from 'react';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
export interface AlertEpisodeAssigneeCellProps {
    assigneeUid: string | null | undefined;
    userProfile: UserProfileService;
}
export declare const AlertEpisodeAssigneeCell: ({ assigneeUid, userProfile, }: AlertEpisodeAssigneeCellProps) => React.JSX.Element;
