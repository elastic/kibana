import React from 'react';
import type { UserAvatarProps } from '@kbn/user-profile-components';
import type { UserInfoWithAvatar } from './types';
export interface CaseUserAvatarProps {
    size: UserAvatarProps['size'];
    userInfo?: UserInfoWithAvatar;
}
export declare const CaseUserAvatar: React.NamedExoticComponent<CaseUserAvatarProps>;
