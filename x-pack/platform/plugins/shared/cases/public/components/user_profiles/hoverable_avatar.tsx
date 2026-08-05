/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { UserInfoWithAvatar } from './types';
import { CaseUserAvatar } from './user_avatar';
import { UserToolTip } from './user_tooltip';

const HoverableAvatarComponent: React.FC<{
  userInfo?: UserInfoWithAvatar;
}> = ({ userInfo }) => {
  return (
    <UserToolTip userInfo={userInfo}>
      <CaseUserAvatar size={'m'} userInfo={userInfo} />
    </UserToolTip>
  );
};

HoverableAvatarComponent.displayName = 'HoverableAvatar';

export const HoverableAvatar = React.memo(HoverableAvatarComponent);
