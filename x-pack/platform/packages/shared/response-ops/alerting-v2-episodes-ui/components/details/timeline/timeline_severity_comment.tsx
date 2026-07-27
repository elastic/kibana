/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAvatar, EuiComment, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { AlertEpisodeSeverityBadge } from '../../severity/episode_severity_badge';
import { getEpisodeSeverityLabel } from '../../severity/severity_utils';
import type { SeverityChangeEntry } from './entries';
import { AlertEpisodeTimelineRelativeTimestamp } from './timeline_relative_timestamp';
import * as i18n from './translations';

export interface AlertEpisodeTimelineSeverityCommentProps {
  entry: SeverityChangeEntry;
}

export const AlertEpisodeTimelineSeverityComment = ({
  entry,
}: AlertEpisodeTimelineSeverityCommentProps) => {
  const isInitial = entry.prevSeverity === undefined;
  const verb = isInitial ? i18n.SET_SEVERITY_TO : i18n.CHANGED_SEVERITY_TO;

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
          iconType={isInitial ? 'flag' : 'arrowRight'}
          color="subdued"
        />
      }
      event={
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>{verb}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <AlertEpisodeSeverityBadge severity={entry.newSeverity} />
          </EuiFlexItem>
          {entry.prevSeverity !== undefined && (
            <EuiFlexItem grow={false}>
              {i18n.getAfterNEventsLabel(
                entry.prevEventCount,
                getEpisodeSeverityLabel(entry.prevSeverity)
              )}
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      }
    />
  );
};
