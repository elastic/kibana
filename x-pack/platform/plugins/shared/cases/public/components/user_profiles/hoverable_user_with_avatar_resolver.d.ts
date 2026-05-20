import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import React from 'react';
import type { CaseUser } from '../../containers/types';
export declare const HoverableUserWithAvatarResolver: React.NamedExoticComponent<{
    user: CaseUser;
    userProfiles?: Map<string, UserProfileWithAvatar>;
} & Pick<import("./username").UsernameProps, "boldName">>;
