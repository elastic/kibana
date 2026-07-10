/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAvatar, EuiComment, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { UserAvatar } from '@kbn/user-profile-components';
import type { EpisodeActionHistoryEntry } from '../../../queries/episode_actions_history_query';
import { ACTION_ICON } from './entries';
import { AlertEpisodeTimelineActionEvent } from './timeline_action_event';
import { AlertEpisodeTimelineRelativeTimestamp } from './timeline_relative_timestamp';
import * as i18n from './translations';

export interface AlertEpisodeTimelineActionCommentProps {
  entry: EpisodeActionHistoryEntry;
  profilesMap: Map<string, UserProfileWithAvatar>;
}

export const AlertEpisodeTimelineActionComment = ({
  entry,
  profilesMap,
}: AlertEpisodeTimelineActionCommentProps) => {
  const profile = entry.actor ? profilesMap.get(entry.actor) : undefined;
  const assigneeProfile = entry.assignee_uid ? profilesMap.get(entry.assignee_uid) : undefined;
  const displayName =
    profile?.user.full_name ?? profile?.user.username ?? entry.actor ?? i18n.SYSTEM_LABEL;
  const username = profile ? (
    <EuiFlexGroup
      gutterSize="xs"
      alignItems="center"
      responsive={false}
      data-test-subj="alertingV2TimelineActorAvatar"
    >
      <EuiFlexItem grow={false}>
        <UserAvatar user={profile.user} avatar={profile.data?.avatar} size="s" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <strong>{displayName}</strong>
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    displayName
  );

  return (
    <EuiComment
      data-test-subj="alertingV2TimelineEntry"
      data-timestamp={entry['@timestamp']}
      username={username}
      timestamp={<AlertEpisodeTimelineRelativeTimestamp timestamp={entry['@timestamp']} />}
      event={<AlertEpisodeTimelineActionEvent entry={entry} assigneeProfile={assigneeProfile} />}
      timelineAvatar={
        <EuiAvatar
          size="s"
          name={entry.action_type}
          iconType={(ACTION_ICON[entry.action_type] as IconType | undefined) ?? 'bell'}
          color="subdued"
        />
      }
    />
  );
};
