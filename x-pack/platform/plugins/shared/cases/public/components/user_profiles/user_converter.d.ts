import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { CaseUser } from '../../containers/types';
import type { CaseUserWithProfileInfo, UserInfoWithAvatar } from './types';
export declare const convertToUserInfo: (user: CaseUser, userProfiles?: Map<string, UserProfileWithAvatar>) => {
    key: string;
    userInfo: UserInfoWithAvatar;
} | undefined;
export declare const convertToCaseUserWithProfileInfo: (user: CaseUser) => CaseUserWithProfileInfo;
