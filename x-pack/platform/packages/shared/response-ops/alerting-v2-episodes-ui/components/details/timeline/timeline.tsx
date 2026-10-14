/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiAvatar, EuiButtonEmpty, EuiComment, EuiCommentList, useEuiTheme } from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { TimelineEntry } from './entries';
import { AlertEpisodeTimelineActionComment } from './timeline_action_comment';
import { AlertEpisodeTimelineSeverityComment } from './timeline_severity_comment';
import { AlertEpisodeTimelineStateComment } from './timeline_state_comment';
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

  const lastActionIndex = entries.reduce(
    (lastIdx, item, idx) => (item.kind === 'action' ? idx : lastIdx),
    -1
  );
  // Actions are paginated but status/severity changes are always loaded in full, so hide
  // anything older than the oldest loaded action while more can still load — otherwise the
  // next page would insert content between entries that are already visible, instead of
  // only ever revealing more below.
  const visibleEntries = hasMore ? entries.slice(0, lastActionIndex + 1) : entries;

  const renderedEntries = visibleEntries.map((item, idx) => {
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
      return <AlertEpisodeTimelineSeverityComment key={`severity-${idx}`} entry={item} />;
    }

    return <AlertEpisodeTimelineStateComment key={`state-${idx}`} entry={item} />;
  });

  if (hasMore) {
    renderedEntries.push(
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
      css={css`
        /* EuiTimelineItemEvent renders as a bare div with flex:1 and no min-width:0,
           causing wide content (e.g. long tag lists) to expand the row past its container.
           EuiComment passes className="euiComment" to EuiTimelineItem (<li>), so we
           target the second div child (the event column) from there. */
        .euiComment > div:last-child {
          min-width: 0;
        }

        /* The load-more row is always the last item, so EUI's own :last-child rule already
           shrinks its connecting-line segment to span only from its top down to its own
           vertical center (see euiTimelineStyles) — which is where the button sits. Fading
           that segment to transparent makes the line itself signal the breakpoint, instead
           of a marker icon. */
        .${LOAD_MORE_ITEM_CLASS_NAME} > [class*='euiTimelineItemIcon-']::before {
          border-left: none;
          width: ${euiTheme.border.width.thick};
          background-image: linear-gradient(to bottom, ${euiTheme.border.color}, transparent);
        }
      `}
    >
      {renderedEntries}
    </EuiCommentList>
  );
};
