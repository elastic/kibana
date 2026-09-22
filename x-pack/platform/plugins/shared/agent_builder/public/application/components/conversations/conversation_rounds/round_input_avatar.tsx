/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAvatar } from '@elastic/eui';
import { UserAvatar, type UserProfileWithAvatar } from '@kbn/user-profile-components';

interface RoundInputAvatarProps {
  profile?: UserProfileWithAvatar;
  name?: string;
}

export const RoundInputAvatar: React.FC<RoundInputAvatarProps> = ({ profile, name }) => {
  if (profile) {
    return <UserAvatar user={profile.user} avatar={profile.data?.avatar} size="s" />;
  }

  if (name) {
    return <EuiAvatar size="s" name={name} />;
  }

  return null;
};
