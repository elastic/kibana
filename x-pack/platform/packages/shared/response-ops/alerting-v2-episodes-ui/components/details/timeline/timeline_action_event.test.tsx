/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { EpisodeActionHistoryEntry } from '../../../queries/episode_actions_history_query';
import { AlertEpisodeTimelineActionEvent } from './timeline_action_event';

const makeEntry = (
  overrides: Partial<EpisodeActionHistoryEntry> = {}
): EpisodeActionHistoryEntry => ({
  _id: 'action-1',
  '@timestamp': '2026-07-02T10:00:00.000Z',
  action_type: 'ack',
  actor: 'user-1',
  episode_id: 'episode-1',
  group_hash: 'group-1',
  tags: null,
  assignee_uid: null,
  expiry: null,
  reason: null,
  ...overrides,
});

const renderEvent = (entry: EpisodeActionHistoryEntry) =>
  render(
    <I18nProvider>
      <AlertEpisodeTimelineActionEvent entry={entry} assigneeProfile={undefined} />
    </I18nProvider>
  );

describe('AlertEpisodeTimelineActionEvent', () => {
  it('does not render assignee details for non-assign actions', () => {
    renderEvent(makeEntry({ action_type: 'ack', assignee_uid: null }));

    expect(screen.queryByTestId('alertingV2TimelineActionAssignee')).not.toBeInTheDocument();
  });

  it('renders assignee details when assignee_uid is set', () => {
    renderEvent(makeEntry({ action_type: 'assign', assignee_uid: 'user-2' }));

    expect(screen.getByTestId('alertingV2TimelineActionAssignee')).toBeInTheDocument();
    expect(screen.getByText('user-2')).toBeInTheDocument();
  });

  it('renders the removed-assignee label when assignee_uid is null on an assign action', () => {
    renderEvent(makeEntry({ action_type: 'assign', assignee_uid: null }));

    expect(screen.getByTestId('alertingV2TimelineActionAssignee')).toBeInTheDocument();
    expect(screen.getByText('removed the assignee')).toBeInTheDocument();
  });

  it('renders tags inline for tag actions', () => {
    renderEvent(makeEntry({ action_type: 'tag', tags: ['prod', 'db'] }));

    expect(screen.getByText('prod')).toBeInTheDocument();
    expect(screen.getByText('db')).toBeInTheDocument();
  });

  it('renders the snoozed-indefinitely label when snoozing without an expiry', () => {
    renderEvent(makeEntry({ action_type: 'snooze', expiry: null }));

    expect(screen.getByText('Indefinitely')).toBeInTheDocument();
  });
});
