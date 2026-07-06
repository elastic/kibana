/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { EpisodeActionHistoryEntry } from '../../../queries/episode_actions_history_query';
import { AlertEpisodeTimelineActionComment } from './timeline_action_comment';

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

const mockProfile: UserProfileWithAvatar = {
  uid: 'user-1',
  enabled: true,
  data: {},
  user: { username: 'jane', full_name: 'Jane Doe', email: 'jane@example.com' },
};

const renderComment = (
  entry: EpisodeActionHistoryEntry,
  profilesMap: Map<string, UserProfileWithAvatar> = new Map()
) =>
  render(
    <I18nProvider>
      <AlertEpisodeTimelineActionComment entry={entry} profilesMap={profilesMap} />
    </I18nProvider>
  );

describe('AlertEpisodeTimelineActionComment', () => {
  it('renders the actor avatar when the actor profile is resolved', () => {
    renderComment(makeEntry({ actor: 'user-1' }), new Map([['user-1', mockProfile]]));

    expect(screen.getByTestId('alertingV2TimelineActorAvatar')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('does not render an avatar when the actor has no resolved profile', () => {
    renderComment(makeEntry({ actor: 'user-1' }), new Map());

    expect(screen.queryByTestId('alertingV2TimelineActorAvatar')).not.toBeInTheDocument();
    expect(screen.getByText('user-1')).toBeInTheDocument();
  });

  it('falls back to the system label with no avatar when there is no actor', () => {
    renderComment(makeEntry({ actor: null }), new Map());

    expect(screen.queryByTestId('alertingV2TimelineActorAvatar')).not.toBeInTheDocument();
    expect(screen.getByText('system')).toBeInTheDocument();
  });
});
