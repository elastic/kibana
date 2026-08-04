import React from 'react';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { CaseUserWithProfileInfo } from '../../../../user_profiles/types';
export interface ParticipantsFieldProps {
    title: string;
    dataTestSubj: string;
    isLoading: boolean;
    caseId: string;
    caseTitle: string;
    userProfiles: Map<string, UserProfileWithAvatar>;
    users: CaseUserWithProfileInfo[];
}
export declare const ParticipantsField: React.NamedExoticComponent<ParticipantsFieldProps>;
