import React from 'react';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
export interface EpisodeAssigneeCellProps {
    assigneeUid: string | null | undefined;
    userProfile: UserProfileService;
}
export declare function EpisodeAssigneeCell({ assigneeUid, userProfile }: EpisodeAssigneeCellProps): React.JSX.Element;
