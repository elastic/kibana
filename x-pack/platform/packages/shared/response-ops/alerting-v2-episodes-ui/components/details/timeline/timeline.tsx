/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiAvatar,
  EuiButtonEmpty,
  EuiComment,
  EuiCommentList,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
} from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { AlertEpisodeStatusBadge } from '../../status/status_badge';
import { AlertEpisodeSeverityBadge } from '../../severity/episode_severity_badge';
import { getEpisodeSeverityLabel } from '../../severity/severity_utils';
import type { TimelineEntry } from './entries';
import { AlertEpisodeTimelineActionComment } from './timeline_action_comment';
import { AlertEpisodeTimelineRelativeTimestamp } from './timeline_relative_timestamp';
import * as i18n from './translations';

export interface AlertEpisodeTimelineProps {
  entries: TimelineEntry[];
  profilesMap: Map<string, UserProfileWithAvatar>;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

/** Marks the load-more breakpoint's <li> so the connecting line can fade into/out of it. */
const LOAD_MORE_ITEM_CLASS_NAME = 'alertingV2TimelineLoadMoreItem';

export const AlertEpisodeTimeline = ({
  entries,
  profilesMap,
  onLoadMore,
  hasMore,
  isLoadingMore,
}: AlertEpisodeTimelineProps) => {
  const { euiTheme } = useEuiTheme();
  const renderedEntries = entries.map((item, idx) => {
    if (item.kind === 'action') {
      return (
        <AlertEpisodeTimelineActionComment
          key={`action-${idx}`}
          entry={item.entry}
          profilesMap={profilesMap}
        />
      );
    }

    if (item.kind === 'severity_change') {
      const isInitial = item.prevSeverity === undefined;
      return (
        <EuiComment
          key={`severity-${idx}`}
          data-test-subj="alertingV2TimelineEntry"
          data-timestamp={item.timestamp}
          username={i18n.SYSTEM_LABEL}
          timestamp={<AlertEpisodeTimelineRelativeTimestamp timestamp={item.timestamp} />}
          timelineAvatar={
            <EuiAvatar
              size="s"
              name={isInitial ? i18n.SET_SEVERITY_TO : i18n.CHANGED_SEVERITY_TO}
              iconType={isInitial ? 'flag' : 'arrowRight'}
              color="subdued"
            />
          }
          event={
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
              <EuiFlexItem grow={false}>
                {isInitial ? i18n.SET_SEVERITY_TO : i18n.CHANGED_SEVERITY_TO}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <AlertEpisodeSeverityBadge severity={item.newSeverity} />
              </EuiFlexItem>
              {item.prevSeverity !== undefined && (
                <EuiFlexItem grow={false}>
                  {i18n.getAfterNEventsLabel(
                    item.prevEventCount,
                    getEpisodeSeverityLabel(item.prevSeverity)
                  )}
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          }
        />
      );
    }

    const isInitial = item.prevStatus === undefined;
    return (
      <EuiComment
        key={`state-${idx}`}
        data-test-subj="alertingV2TimelineEntry"
        data-timestamp={item.timestamp}
        username={i18n.SYSTEM_LABEL}
        timestamp={<AlertEpisodeTimelineRelativeTimestamp timestamp={item.timestamp} />}
        timelineAvatar={
          <EuiAvatar
            size="s"
            name={isInitial ? i18n.STARTED_EPISODE_AS : i18n.CHANGED_STATUS_TO}
            iconType={isInitial ? 'flag' : 'arrowRight'}
            color="subdued"
          />
        }
        event={
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              {isInitial ? i18n.STARTED_EPISODE_AS : i18n.CHANGED_STATUS_TO}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <AlertEpisodeStatusBadge status={item.newStatus} />
            </EuiFlexItem>
            {item.prevStatus !== undefined && (
              <EuiFlexItem grow={false}>
                {i18n.getAfterNEventsLabel(
                  item.prevEventCount,
                  i18n.STATUS_LABELS[item.prevStatus] ?? item.prevStatus
                )}
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        }
      />
    );
  });

  if (hasMore) {
    // Only actions are paginated, so insert after the oldest loaded action rather than at
    // the bottom, to avoid implying there's more status/severity history to load too.
    const lastActionIndex = entries.reduce(
      (lastIdx, item, idx) => (item.kind === 'action' ? idx : lastIdx),
      -1
    );
    const insertAt = lastActionIndex === -1 ? renderedEntries.length : lastActionIndex + 1;

    renderedEntries.splice(
      insertAt,
      0,
      <EuiComment
        key="load-more"
        className={LOAD_MORE_ITEM_CLASS_NAME}
        username=""
        timelineAvatar={
          // Kept for layout/column alignment, but hidden — the fading connecting line
          // (see the css block below) marks the breakpoint instead of a marker icon.
          <EuiAvatar
            size="s"
            name={i18n.LOAD_MORE}
            iconType="dot"
            color="subdued"
            css={{ visibility: 'hidden' }}
          />
        }
        event={
          <EuiButtonEmpty
            data-test-subj="alertingV2TimelineLoadMore"
            onClick={onLoadMore}
            isLoading={isLoadingMore}
            iconType="sortDown"
            size="s"
            flush="left"
          >
            {i18n.LOAD_MORE}
          </EuiButtonEmpty>
        }
      />
    );
  }

  return (
    <EuiCommentList
      gutterSize="l"
      css={css`
        /* EuiTimelineItemEvent renders as a bare div with flex:1 and no min-width:0,
           causing wide content (e.g. long tag lists) to expand the row past its container.
           EuiComment passes className="euiComment" to EuiTimelineItem (<li>), so we
           target the second div child (the event column) from there. */
        .euiComment > div:last-child {
          min-width: 0;
        }

        /* Fade the (normally solid) connecting line to transparent at this row's vertical
           center — roughly where the button sits — and back to solid by its bottom edge, so
           the line itself signals the breakpoint instead of a marker icon. "100% - gutter"
           is this row's own bottom edge, since the icon column's pseudo-element also extends
           through the trailing gutter gap into the next item (see EUI's euiTimelineStyles). */
        .${LOAD_MORE_ITEM_CLASS_NAME} > [class*='euiTimelineItemIcon-']::before {
          border-left: none;
          width: ${euiTheme.border.width.thick};
          background-image: linear-gradient(
            to bottom,
            ${euiTheme.border.color} 0%,
            transparent calc((100% - ${euiTheme.size.l}) / 2),
            ${euiTheme.border.color} calc(100% - ${euiTheme.size.l})
          );
        }
      `}
    >
      {renderedEntries}
    </EuiCommentList>
  );
};
