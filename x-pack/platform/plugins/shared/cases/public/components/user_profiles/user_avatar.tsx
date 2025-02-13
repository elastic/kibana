/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { UserAvatarProps } from '@kbn/user-profile-components';
import { UserAvatar } from '@kbn/user-profile-components';
import { CaseUnknownUserAvatar } from './unknown_user';
import type { UserInfoWithAvatar } from './types';

export interface CaseUserAvatarProps {
  size: UserAvatarProps['size'];
  userInfo?: UserInfoWithAvatar;
}

const CaseUserAvatarComponent: React.FC<CaseUserAvatarProps> = ({ size, userInfo }) => {
  const dataTestSubjName = userInfo?.user?.username;

  return userInfo?.user !== undefined ? (
    <UserAvatar
      user={userInfo?.user}
      avatar={userInfo?.data?.avatar}
      data-test-subj={`case-user-profile-avatar-${dataTestSubjName}`}
      size={size}
    />
  ) : (
    <CaseUnknownUserAvatar size={size} />
  );
};

CaseUserAvatarComponent.displayName = 'CaseUserAvatar';

export const CaseUserAvatar = React.memo(CaseUserAvatarComponent);
