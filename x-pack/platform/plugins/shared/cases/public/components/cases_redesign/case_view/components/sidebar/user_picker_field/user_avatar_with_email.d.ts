import React from 'react';
import type { UserInfoWithAvatar } from '../../../../../user_profiles/types';
export interface UserAvatarWithEmailProps {
    userInfo?: UserInfoWithAvatar;
    caseId: string;
    caseTitle: string;
}
export declare const UserAvatarWithEmail: React.FC<UserAvatarWithEmailProps>;
