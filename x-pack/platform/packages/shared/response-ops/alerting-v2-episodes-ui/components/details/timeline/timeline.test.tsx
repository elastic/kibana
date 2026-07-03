/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type { EpisodeActionHistoryEntry } from '../../../queries/episode_actions_history_query';
import type { ActionEntry, StateChangeEntry, TimelineEntry } from './entries';
import { AlertEpisodeTimeline } from './timeline';

const makeAction = (id: string, ts: string): ActionEntry => ({
  kind: 'action',
  entry: {
    _id: id,
    '@timestamp': ts,
    action_type: 'ack',
    actor: 'user-1',
    episode_id: 'ep-1',
    group_hash: 'hash-1',
    tags: null,
    assignee_uid: null,
    expiry: null,
    reason: null,
  } as EpisodeActionHistoryEntry,
});

const makeStateChange = (ts: string): StateChangeEntry => ({
  kind: 'state_change',
  timestamp: ts,
  newStatus: ALERT_EPISODE_STATUS.ACTIVE,
  prevStatus: undefined,
  prevEventCount: 0,
});

const renderTimeline = (
  entries: TimelineEntry[],
  props: Partial<Parameters<typeof AlertEpisodeTimeline>[0]> = {}
) =>
  render(
    <I18nProvider>
      <AlertEpisodeTimeline entries={entries} profilesMap={new Map()} {...props} />
    </I18nProvider>
  );

describe('AlertEpisodeTimeline', () => {
  it('does not render a load-more control when hasMore is false', () => {
    renderTimeline([makeAction('a1', '2024-01-01T00:01:00.000Z')], { hasMore: false });
    expect(screen.queryByTestId('alertingV2TimelineLoadMore')).not.toBeInTheDocument();
  });

  it('places the load-more control right after the oldest loaded action, not at the bottom of the whole list', () => {
    // Newest-first: an action, then a complete (non-paginated) state entry that is OLDER than
    // the action. Only the action feed is paginated, so the control must sit between them —
    // not below the state entry, which would wrongly suggest more state history exists.
    renderTimeline(
      [makeAction('a1', '2024-01-01T00:02:00.000Z'), makeStateChange('2024-01-01T00:00:00.000Z')],
      { hasMore: true }
    );

    const listItems = document.querySelectorAll('ol[role="list"] > li');
    expect(listItems).toHaveLength(3);
    expect(listItems[0]).toHaveAttribute('data-timestamp', '2024-01-01T00:02:00.000Z');
    expect(
      within(listItems[1] as HTMLElement).getByTestId('alertingV2TimelineLoadMore')
    ).toBeInTheDocument();
    // The connecting line fades out/in around this breakpoint (via a dedicated class),
    // signaling this point in the timeline has unloaded data.
    expect(listItems[1]).toHaveClass('alertingV2TimelineLoadMoreItem');
    expect(listItems[2]).toHaveAttribute('data-test-subj', 'alertingV2TimelineEntry');
    expect(listItems[2]).toHaveAttribute('data-timestamp', '2024-01-01T00:00:00.000Z');
  });

  it('falls back to appending the load-more control at the end when there are no loaded actions', () => {
    renderTimeline([makeStateChange('2024-01-01T00:00:00.000Z')], { hasMore: true });

    const listItems = document.querySelectorAll('ol[role="list"] > li');
    expect(listItems).toHaveLength(2);
    expect(
      within(listItems[1] as HTMLElement).getByTestId('alertingV2TimelineLoadMore')
    ).toBeInTheDocument();
  });
});
