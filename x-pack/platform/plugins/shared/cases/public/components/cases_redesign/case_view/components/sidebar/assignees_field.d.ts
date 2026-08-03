import React from 'react';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { CaseAssignees } from '../../../../../../common/types/domain';
import type { Assignee } from '../../../../user_profiles/types';
import type { CurrentUserProfile } from '../../../../types';
export interface AssigneesFieldProps {
    title: string;
    dataTestSubj: string;
    isLoading: boolean;
    caseId: string;
    caseTitle: string;
    userProfiles: Map<string, UserProfileWithAvatar>;
    caseAssignees: CaseAssignees;
    currentUserProfile: CurrentUserProfile;
    onAssigneesChanged: (assignees: Assignee[]) => void;
}
export declare const AssigneesField: React.NamedExoticComponent<AssigneesFieldProps>;
