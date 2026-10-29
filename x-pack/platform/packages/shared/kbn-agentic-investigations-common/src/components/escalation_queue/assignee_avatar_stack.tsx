/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { UserAvatar, UserToolTip } from '@kbn/user-profile-components';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';

const MAX_VISIBLE_ASSIGNEES = 4;

interface AssigneeAvatarStackProps {
  profiles: UserProfileWithAvatar[];
}

/**
 * Read-only avatar stack with a `+N` overflow badge.
 *
 * Renders up to `MAX_VISIBLE_ASSIGNEES` avatars with per-avatar tooltips.
 * When more profiles are present a `+N` hollow badge with a comma-separated
 * tooltip of the hidden names is appended.
 */
export const AssigneeAvatarStack = ({ profiles }: AssigneeAvatarStackProps) => {
  const visible = profiles.slice(0, MAX_VISIBLE_ASSIGNEES);
  const overflow = profiles.slice(MAX_VISIBLE_ASSIGNEES);

  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
      {visible.map((profile) => (
        <EuiFlexItem key={profile.uid} grow={false}>
          <UserToolTip user={profile.user} avatar={profile.data?.avatar}>
            <UserAvatar user={profile.user} avatar={profile.data?.avatar} size="s" />
          </UserToolTip>
        </EuiFlexItem>
      ))}
      {overflow.length > 0 && (
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={overflow
              .map((p) => p.user.full_name || p.user.email || p.user.username || p.uid)
              .join(', ')}
          >
            <EuiBadge color="hollow" tabIndex={0}>
              +{overflow.length}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
