/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonCircle,
  EuiSkeletonText,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import { useQuery } from '@kbn/react-query';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { UserAvatar } from '@kbn/user-profile-components';
import { EMPTY_VALUE } from '../constants';
import * as i18n from './translations';

export interface UserProfileDisplayProps {
  userProfileUid: string | null | undefined;
  userProfile: UserProfileService;
  emptyState?: ReactNode;
  isTooltipFocusable?: boolean;
  dataTestSubj?: string;
}

export const UserProfileDisplay = ({
  userProfileUid,
  userProfile,
  emptyState = EMPTY_VALUE,
  isTooltipFocusable = true,
  dataTestSubj = 'alertingV2UserProfileDisplay',
}: UserProfileDisplayProps) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['alertingV2UserProfile', userProfileUid],
    queryFn: () =>
      userProfile.bulkGet({
        uids: new Set([userProfileUid!]),
        dataPath: 'avatar',
      }),
    enabled: Boolean(userProfileUid),
    staleTime: 60_000,
    retry: 1,
  });

  if (!userProfileUid) {
    return (
      <EuiText color="subdued" size="s">
        {emptyState}
      </EuiText>
    );
  }

  if (isLoading) {
    return (
      <EuiFlexGroup
        gutterSize="xs"
        alignItems="center"
        responsive={false}
        data-test-subj={`${dataTestSubj}Loading`}
      >
        <EuiFlexItem grow={false}>
          <EuiSkeletonCircle size="s" />
        </EuiFlexItem>
        <EuiFlexItem css={{ maxWidth: 120 }}>
          <EuiSkeletonText lines={1} size="s" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (isError) {
    return (
      <EuiToolTip content={userProfileUid}>
        <EuiText tabIndex={isTooltipFocusable ? 0 : undefined} color="danger" size="s">
          {i18n.ASSIGNEE_CELL_PROFILE_LOAD_ERROR}
        </EuiText>
      </EuiToolTip>
    );
  }

  const profile = data?.[0] as UserProfileWithAvatar;

  if (!profile) {
    return (
      <EuiToolTip content={userProfileUid}>
        <EuiText tabIndex={isTooltipFocusable ? 0 : undefined} color="subdued" size="s">
          {i18n.ASSIGNEE_CELL_UNKNOWN_USER}
        </EuiText>
      </EuiToolTip>
    );
  }

  const { user } = profile;
  const username = user.username;
  const avatar = profile.data?.avatar;

  return (
    <EuiFlexGroup
      gutterSize="xs"
      alignItems="center"
      responsive={false}
      css={{ minWidth: 0 }}
      data-test-subj={dataTestSubj}
    >
      <EuiFlexItem grow={false}>
        <UserAvatar user={user} avatar={avatar} size="s" />
      </EuiFlexItem>
      <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
        <EuiText size="s" className="eui-textTruncate" title={username}>
          {username}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
