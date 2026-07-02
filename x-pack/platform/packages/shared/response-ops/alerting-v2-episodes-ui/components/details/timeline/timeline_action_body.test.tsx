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
import { AlertEpisodeTimelineActionBody } from './timeline_action_body';

const makeEntry = (
  overrides: Partial<EpisodeActionHistoryEntry> = {}
): EpisodeActionHistoryEntry => ({
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

const renderBody = (entry: EpisodeActionHistoryEntry) =>
  render(
    <I18nProvider>
      <AlertEpisodeTimelineActionBody entry={entry} assigneeProfile={undefined} />
    </I18nProvider>
  );

describe('AlertEpisodeTimelineActionBody', () => {
  it('does not render assignee details when assignee_uid is null', () => {
    renderBody(makeEntry({ action_type: 'ack', assignee_uid: null }));

    expect(screen.queryByTestId('alertingV2TimelineActionAssignee')).not.toBeInTheDocument();
  });

  it('renders assignee details when assignee_uid is set', () => {
    renderBody(makeEntry({ action_type: 'assign', assignee_uid: 'user-2' }));

    expect(screen.getByTestId('alertingV2TimelineActionAssignee')).toBeInTheDocument();
    expect(screen.getByText('user-2')).toBeInTheDocument();
  });
});
