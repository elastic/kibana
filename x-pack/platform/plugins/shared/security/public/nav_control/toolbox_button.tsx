/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';

import type { UserProfileAvatarData } from '@kbn/user-profile-components';
import { UserAvatar } from '@kbn/user-profile-components';

import { useCurrentUser, useUserProfile } from '../components';

export const ToolboxButton = () => {
  const userProfile = useUserProfile<{ avatar: UserProfileAvatarData }>('avatar,userSettings');
  const currentUser = useCurrentUser(); // User profiles do not exist for anonymous users so need to fetch current user as well

  if (userProfile.value) {
    return (
      <UserAvatar
        user={userProfile.value.user}
        avatar={userProfile.value.data.avatar}
        size="s"
        data-test-subj="userMenuAvatar"
      />
    );
  } else if (currentUser.value && userProfile.error) {
    return <UserAvatar user={currentUser.value} size="s" data-test-subj="userMenuAvatar" />;
  }

  return <EuiLoadingSpinner size="m" />;
};
