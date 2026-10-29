/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAvatar, EuiComment, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { AlertEpisodeStatusBadge } from '../../status/status_badge';
import { AlertEpisodeCollapsedEventsWarning } from '../collapsed_events_warning';
import type { StateChangeEntry } from './entries';
import { AlertEpisodeTimelineRelativeTimestamp } from './timeline_relative_timestamp';
import * as i18n from './translations';

export interface AlertEpisodeTimelineStateCommentProps {
  entry: StateChangeEntry;
  /** When set, the change is between collapsed phases and a warning names this event limit. */
  collapsedEventLimit?: number;
}

export const AlertEpisodeTimelineStateComment = ({
  entry,
  collapsedEventLimit,
}: AlertEpisodeTimelineStateCommentProps) => {
  const isInitial = entry.prevStatus === undefined;
  const verb = isInitial ? i18n.STARTED_EPISODE_AS : i18n.CHANGED_STATUS_TO;

  return (
    <EuiComment
      data-test-subj="alertingV2TimelineEntry"
      data-timestamp={entry.timestamp}
      username={i18n.SYSTEM_LABEL}
      timestamp={<AlertEpisodeTimelineRelativeTimestamp timestamp={entry.timestamp} />}
      timelineAvatar={
        <EuiAvatar
          size="s"
          name={verb}
          iconType={isInitial ? 'flag' : 'chevronSingleRight'}
          color="subdued"
        />
      }
      event={
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>{verb}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <AlertEpisodeStatusBadge status={entry.newStatus} />
          </EuiFlexItem>
          {entry.prevStatus !== undefined && (
            <EuiFlexItem grow={false}>
              {i18n.getAfterNEventsLabel(
                entry.prevEventCount,
                i18n.STATUS_LABELS[entry.prevStatus] ?? entry.prevStatus
              )}
            </EuiFlexItem>
          )}
          {entry.prevStatus !== undefined && collapsedEventLimit !== undefined && (
            <EuiFlexItem grow={false}>
              <AlertEpisodeCollapsedEventsWarning eventLimit={collapsedEventLimit} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      }
    />
  );
};
