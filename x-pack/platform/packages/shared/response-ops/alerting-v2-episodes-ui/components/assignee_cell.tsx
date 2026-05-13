/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import { useQuery } from '@kbn/react-query';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { UserAvatar, UserToolTip } from '@kbn/user-profile-components';

const EMPTY_LABEL = i18n.translate('xpack.alertingV2EpisodesUi.assigneeCell.empty', {
  defaultMessage: '—',
});

const PROFILE_LOAD_ERROR_LABEL = i18n.translate(
  'xpack.alertingV2EpisodesUi.assigneeCell.profileLoadError',
  {
    defaultMessage: 'Could not load profile',
  }
);

const UNKNOWN_USER_LABEL = i18n.translate('xpack.alertingV2EpisodesUi.assigneeCell.unknownUser', {
  defaultMessage: 'Unknown user',
});

export interface AlertEpisodeAssigneeCellProps {
  assigneeUid: string | null | undefined;
  userProfile: UserProfileService;
}

export const AlertEpisodeAssigneeCell = ({
  assigneeUid,
  userProfile,
}: AlertEpisodeAssigneeCellProps) => {
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
        {EMPTY_LABEL}
      </EuiText>
    );
  }

  if (isLoading) {
    return <EuiLoadingSpinner size="s" />;
  }

  if (isError) {
    return (
      <EuiText color="danger" size="s" title={assigneeUid}>
        {PROFILE_LOAD_ERROR_LABEL}
      </EuiText>
    );
  }

  const profile = data?.[0] as UserProfileWithAvatar;

  if (!profile) {
    return (
      <EuiText color="subdued" size="s" title={assigneeUid}>
        {UNKNOWN_USER_LABEL}
      </EuiText>
    );
  }

  const user = profile.user;
  const username = user.username;
  const avatar = profile.data?.avatar;

  return (
    <UserToolTip user={user} avatar={avatar} position="top">
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
};
