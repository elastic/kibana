import React from 'react';
import type { UserInfoWithAvatar } from './types';
export interface UsernameProps {
    userInfo?: UserInfoWithAvatar;
    boldName?: boolean;
}
export declare const Username: React.NamedExoticComponent<UsernameProps>;
