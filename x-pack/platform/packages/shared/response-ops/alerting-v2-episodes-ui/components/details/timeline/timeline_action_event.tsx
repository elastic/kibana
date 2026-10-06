/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { SerializedStyles } from '@emotion/react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { UserAvatar } from '@kbn/user-profile-components';
import type { EpisodeActionHistoryEntry } from '@kbn/alerting-v2-common-queries';
import { TagBadges } from '../../actions/tags';
import * as i18n from './translations';

export interface AlertEpisodeTimelineActionEventProps {
  entry: EpisodeActionHistoryEntry;
  assigneeProfile: UserProfileWithAvatar | undefined;
}

const formatExpiry = (expiry: string): string =>
  new Date(expiry).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

interface ActionSentenceProps extends AlertEpisodeTimelineActionEventProps {
  /** Keeps the assignee avatar inline with the sentence instead of breaking the text flow. */
  inlineDetailStyles: SerializedStyles;
}

/** Builds the complete sentence describing an action, with its details interpolated in place. */
const ActionSentence = ({ entry, assigneeProfile, inlineDetailStyles }: ActionSentenceProps) => {
  const { action_type: actionType } = entry;

  if (actionType === 'assign') {
    if (entry.assignee_uid == null) {
      return <span data-test-subj="alertingV2TimelineActionAssignee">{i18n.REMOVED_ASSIGNEE}</span>;
    }

    const assigneeName =
      assigneeProfile?.user.full_name ?? assigneeProfile?.user.username ?? entry.assignee_uid;

    return (
      <span data-test-subj="alertingV2TimelineActionAssignee">
        <FormattedMessage
          id="xpack.alertingV2EpisodesUi.details.timeline.assignedEpisodeTo"
          defaultMessage="assigned the episode to {assignee}"
          values={{
            assignee: (
              <span css={inlineDetailStyles}>
                {assigneeProfile && (
                  <UserAvatar
                    user={assigneeProfile.user}
                    avatar={assigneeProfile.data?.avatar}
                    size="s"
                  />
                )}
                {assigneeName}
              </span>
            ),
          }}
        />
      </span>
    );
  }

  if (actionType === 'tag') {
    const tags = entry.tags ?? [];
    if (tags.length === 0) {
      return <>{i18n.REMOVED_ALL_TAGS}</>;
    }

    return (
      <FormattedMessage
        id="xpack.alertingV2EpisodesUi.details.timeline.setEpisodeTagsTo"
        defaultMessage="set the tags to {tags}"
        values={{ tags: <TagBadges tags={tags} showAll /> }}
      />
    );
  }

  if (actionType === 'snooze') {
    if (!entry.expiry) {
      return <>{i18n.SNOOZED_INDEFINITELY}</>;
    }

    const until = formatExpiry(entry.expiry);
    const duration = i18n.formatSnoozeDuration(entry['@timestamp'], entry.expiry);

    return (
      <>{duration ? i18n.getSnoozedForLabel(duration, until) : i18n.getSnoozedUntilLabel(until)}</>
    );
  }

  return <>{i18n.ACTION_LABELS[actionType] ?? actionType}</>;
};

/** Renders the sentence-flow event line for an action entry (verb phrase + optional reason). */
export const AlertEpisodeTimelineActionEvent = ({
  entry,
  assigneeProfile,
}: AlertEpisodeTimelineActionEventProps) => {
  const { euiTheme } = useEuiTheme();
  // The avatar is block-level, so it needs an inline-level box to stay in the text flow
  const inlineDetailStyles = css`
    display: inline-flex;
    align-items: center;
    gap: ${euiTheme.size.xs};
    vertical-align: middle;
  `;

  return (
    <span>
      <ActionSentence
        entry={entry}
        assigneeProfile={assigneeProfile}
        inlineDetailStyles={inlineDetailStyles}
      />
      {entry.reason && (
        <span data-test-subj="alertingV2TimelineActionReason"> · {entry.reason}</span>
      )}
    </span>
  );
};
