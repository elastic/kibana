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
import { AlertEpisodeTags } from '../../actions/tags';
import type { EpisodeActionHistoryEntry } from '../../../queries/episode_actions_history_query';
import * as i18n from './translations';

export interface AlertEpisodeTimelineActionEventProps {
  entry: EpisodeActionHistoryEntry;
  assigneeProfile: UserProfileWithAvatar | undefined;
}

/** Renders the sentence-flow event line for an action entry (verb + inline details). */
export const AlertEpisodeTimelineActionEvent = ({
  entry,
  assigneeProfile,
}: AlertEpisodeTimelineActionEventProps) => {
  const parts: React.ReactNode[] = [
    <EuiFlexItem key="verb" grow={false}>
      {i18n.ACTION_LABELS[entry.action_type] ?? entry.action_type}
    </EuiFlexItem>,
  ];

  if (entry.action_type === 'assign') {
    const assigneeName =
      assigneeProfile?.user.full_name ?? assigneeProfile?.user.username ?? entry.assignee_uid;
    parts.push(
      <EuiFlexItem key="assignee" grow={false} data-test-subj="alertingV2TimelineActionAssignee">
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            {entry.assignee_uid != null ? i18n.ASSIGNED_TO : i18n.REMOVED_ASSIGNEE}
          </EuiFlexItem>
          {assigneeName && (
            <>
              {assigneeProfile && (
                <EuiFlexItem grow={false}>
                  <UserAvatar
                    user={assigneeProfile.user}
                    avatar={assigneeProfile.data?.avatar}
                    size="s"
                  />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>{assigneeName}</EuiFlexItem>
            </>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
    );
  }

  if (entry.action_type === 'tag' && Array.isArray(entry.tags) && entry.tags.length > 0) {
    parts.push(
      <EuiFlexItem key="tags" grow={false}>
        <AlertEpisodeTags tags={entry.tags} oneLine />
      </EuiFlexItem>
    );
  }

  if (entry.action_type === 'snooze' && !entry.expiry) {
    parts.push(
      <EuiFlexItem key="expiry" grow={false}>
        {i18n.SNOOZED_INDEFINITELY}
      </EuiFlexItem>
    );
  }

  if (entry.expiry) {
    const untilText = i18n.getSnoozedUntilLabel(
      new Date(entry.expiry).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    );
    const duration =
      entry.action_type === 'snooze'
        ? i18n.formatSnoozeDuration(entry['@timestamp'], entry.expiry)
        : null;
    parts.push(
      <EuiFlexItem key="expiry" grow={false}>
        {duration != null ? `${untilText} · ${duration}` : untilText}
      </EuiFlexItem>
    );
  }

  if (entry.reason) {
    parts.push(
      <EuiFlexItem key="reason" grow={false}>
        {entry.reason}
      </EuiFlexItem>
    );
  }

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
      {parts}
    </EuiFlexGroup>
  );
};
