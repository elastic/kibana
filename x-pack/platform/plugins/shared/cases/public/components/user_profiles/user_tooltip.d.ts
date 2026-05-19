import React from 'react';
import type { UserInfoWithAvatar } from './types';
export interface UserToolTipProps {
    children: React.ReactElement;
    userInfo?: UserInfoWithAvatar;
}
export declare const UserToolTip: React.NamedExoticComponent<UserToolTipProps>;
