/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import { useQuery } from '@kbn/react-query';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { UserAvatar, UserToolTip } from '@kbn/user-profile-components';

import * as i18n from '../translations';

export interface EpisodeAssigneeCellProps {
  assigneeUid: string | null | undefined;
  userProfile: UserProfileService;
}

export function EpisodeAssigneeCell({ assigneeUid, userProfile }: EpisodeAssigneeCellProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['alertingV2EpisodeAssigneeProfile', assigneeUid],
    queryFn: () =>
      userProfile.bulkGet({
        uids: new Set([assigneeUid!]),
        dataPath: 'avatar',
      }),
    enabled: Boolean(assigneeUid),
    staleTime: 60_000,
    retry: 1,
  });

  if (!assigneeUid) {
    return (
      <EuiText color="subdued" size="s">
        {i18n.EPISODES_ASSIGNEE_EMPTY}
      </EuiText>
    );
  }

  if (isLoading) {
    return <EuiLoadingSpinner size="s" />;
  }

  if (isError) {
    return (
      <EuiText color="danger" size="s" title={assigneeUid}>
        {i18n.EPISODES_ASSIGNEE_PROFILE_LOAD_ERROR}
      </EuiText>
    );
  }

  const profile = data?.[0] as UserProfileWithAvatar;

  if (!profile) {
    return (
      <EuiText color="subdued" size="s" title={assigneeUid}>
        {i18n.EPISODES_ASSIGNEE_UNKNOWN_USER}
      </EuiText>
    );
  }

  const user = profile.user;
  const username = user.username;
  const avatar = profile.data?.avatar;

  return (
    <UserToolTip user={user} avatar={avatar} position="top" delay="regular">
      <EuiFlexGroup
        gutterSize="xs"
        alignItems="center"
        responsive={false}
        css={{ minWidth: 0 }}
        data-test-subj="alertingV2EpisodeAssigneeCell"
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
    </UserToolTip>
  );
}
