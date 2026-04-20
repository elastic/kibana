/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import { useQuery } from '@kbn/react-query';
import { UserAvatar, UserToolTip } from '@kbn/user-profile-components';

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
        {i18n.translate('xpack.alertingV2.episodes.assignees.empty', {
          defaultMessage: '—',
        })}
      </EuiText>
    );
  }

  if (isLoading) {
    return <EuiLoadingSpinner size="s" />;
  }

  if (isError) {
    return (
      <EuiText color="danger" size="s" title={assigneeUid}>
        {i18n.translate('xpack.alertingV2.episodes.assignees.profileLoadError', {
          defaultMessage: 'Could not load profile',
        })}
      </EuiText>
    );
  }

  const profile = data?.[0];
  if (!profile) {
    return (
      <EuiText color="subdued" size="s" title={assigneeUid}>
        {i18n.translate('xpack.alertingV2.episodes.assignees.unknownUser', {
          defaultMessage: 'Unknown user',
        })}
      </EuiText>
    );
  }

  return (
    <UserToolTip user={profile.user} avatar={profile.data?.avatar}>
      <UserAvatar user={profile.user} avatar={profile.data?.avatar} size="s" />
    </UserToolTip>
  );
}
