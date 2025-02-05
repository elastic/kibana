/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { UserToolTip } from './user_tooltip';
import { SmallUserAvatar } from './small_user_avatar';
import type { UsernameProps } from './username';
import { Username } from './username';

export type HoverableUserWithAvatarProps = UsernameProps;

const HoverableUserWithAvatarComponent: React.FC<HoverableUserWithAvatarProps> = ({
  userInfo,
  boldName,
}) => {
  return (
    <UserToolTip userInfo={userInfo}>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <SmallUserAvatar userInfo={userInfo} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction={'column'} gutterSize="none">
            <EuiFlexItem>
              <Username userInfo={userInfo} boldName={boldName} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </UserToolTip>
  );
};
HoverableUserWithAvatarComponent.displayName = 'HoverableUserWithAvatar';

export const HoverableUserWithAvatar = React.memo(HoverableUserWithAvatarComponent);
