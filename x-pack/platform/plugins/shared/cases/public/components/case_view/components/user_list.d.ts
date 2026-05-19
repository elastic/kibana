import React from 'react';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { CaseUI } from '../../../containers/types';
import type { CaseUserWithProfileInfo } from '../../user_profiles/types';
interface UserListProps {
    theCase: CaseUI;
    headline: string;
    loading?: boolean;
    users: CaseUserWithProfileInfo[];
    userProfiles?: Map<string, UserProfileWithAvatar>;
    dataTestSubj?: string;
}
export declare const UserList: React.FC<UserListProps>;
export {};
