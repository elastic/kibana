import React from 'react';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { CaseAssignees } from '../../../../common/types/domain';
import type { Assignee } from '../../user_profiles/types';
import type { CurrentUserProfile } from '../../types';
export interface AssignUsersProps {
    caseAssignees: CaseAssignees;
    currentUserProfile: CurrentUserProfile;
    userProfiles: Map<string, UserProfileWithAvatar>;
    onAssigneesChanged: (assignees: Assignee[]) => void;
    isLoading: boolean;
}
export declare const AssignUsers: React.NamedExoticComponent<AssignUsersProps>;
