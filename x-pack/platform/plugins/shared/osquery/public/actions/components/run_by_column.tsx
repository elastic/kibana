/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { UserAvatarCell } from './user_avatar_cell';

export interface RunByColumnProps {
  userId: string | undefined;
  userProfileUid: string | undefined;
  profilesMap: Map<string, UserProfileWithAvatar>;
  isLoadingProfiles: boolean;
}

const RunByColumnComponent: React.FC<RunByColumnProps> = ({
  userId,
  userProfileUid,
  profilesMap,
  isLoadingProfiles,
}) => {
  const profile = userProfileUid ? profilesMap.get(userProfileUid) : undefined;
  const fallbackUser = useMemo(
    () => (userId ? ({ username: userId } as UserProfileWithAvatar['user']) : undefined),
    [userId]
  );

  if (profile) {
    return <UserAvatarCell user={profile.user} avatar={profile.data?.avatar} />;
  }

  if (userProfileUid && isLoadingProfiles && !profilesMap.has(userProfileUid)) {
    return null;
  }

  if (fallbackUser) {
    return <UserAvatarCell user={fallbackUser} />;
  }

  return <>-</>;
};

RunByColumnComponent.displayName = 'RunByColumn';

export const RunByColumn = React.memo(RunByColumnComponent);
