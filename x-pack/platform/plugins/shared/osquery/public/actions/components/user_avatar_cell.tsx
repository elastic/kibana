/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { UserAvatar } from '@kbn/user-profile-components';

interface UserAvatarCellProps {
  user: UserProfileWithAvatar['user'];
  avatar?: UserProfileWithAvatar['data']['avatar'];
}

const UserAvatarCellComponent: React.FC<UserAvatarCellProps> = ({ user, avatar }) => (
  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={false}>
    <EuiFlexItem grow={false}>
      <UserAvatar user={user} avatar={avatar} size="s" />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>{user.full_name || user.username}</EuiFlexItem>
  </EuiFlexGroup>
);

UserAvatarCellComponent.displayName = 'UserAvatarCell';

export const UserAvatarCell = React.memo(UserAvatarCellComponent);
