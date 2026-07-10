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

  it('hides status/severity entries older than the oldest loaded action while more can load', () => {
    // Newest-first: an action, then a complete (non-paginated) state entry that is OLDER than
    // the action. Only the action feed is paginated, so while more can still load, the older
    // state entry is hidden — otherwise a later page could insert content between entries
    // that are already visible, instead of only ever revealing more below the control.
    renderTimeline(
      [makeAction('a1', '2024-01-01T00:02:00.000Z'), makeStateChange('2024-01-01T00:00:00.000Z')],
      { hasMore: true }
    );

    const listItems = document.querySelectorAll('ol[role="list"] > li');
    expect(listItems).toHaveLength(2);
    expect(listItems[0]).toHaveAttribute('data-timestamp', '2024-01-01T00:02:00.000Z');
    // The load-more control always sits at the bottom now that older entries are hidden.
    expect(
      within(listItems[1] as HTMLElement).getByTestId('alertingV2TimelineLoadMore')
    ).toBeInTheDocument();
    // The connecting line fades out at this breakpoint (via a dedicated class), signaling
    // this point in the timeline has unloaded data.
    expect(listItems[1]).toHaveClass('alertingV2TimelineLoadMoreItem');
  });

  it('reveals previously-hidden entries once there is nothing more to load', () => {
    renderTimeline(
      [makeAction('a1', '2024-01-01T00:02:00.000Z'), makeStateChange('2024-01-01T00:00:00.000Z')],
      { hasMore: false }
    );

    const listItems = document.querySelectorAll('ol[role="list"] > li');
    expect(listItems).toHaveLength(2);
    expect(listItems[1]).toHaveAttribute('data-test-subj', 'alertingV2TimelineEntry');
    expect(listItems[1]).toHaveAttribute('data-timestamp', '2024-01-01T00:00:00.000Z');
    expect(screen.queryByTestId('alertingV2TimelineLoadMore')).not.toBeInTheDocument();
  });

  it('hides everything but the load-more control when no actions have loaded yet', () => {
    renderTimeline([makeStateChange('2024-01-01T00:00:00.000Z')], { hasMore: true });

    const listItems = document.querySelectorAll('ol[role="list"] > li');
    expect(listItems).toHaveLength(1);
    expect(
      within(listItems[0] as HTMLElement).getByTestId('alertingV2TimelineLoadMore')
    ).toBeInTheDocument();
  });
});
