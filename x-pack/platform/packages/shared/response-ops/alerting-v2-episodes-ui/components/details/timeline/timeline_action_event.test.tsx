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
import type { EpisodeActionHistoryEntry } from '@kbn/alerting-v2-common-queries';
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

const mockAssigneeProfile = {
  uid: 'user-2',
  enabled: true,
  user: { username: 'jane', full_name: 'Jane Doe' },
  data: {},
} as UserProfileWithAvatar;

const renderEvent = (entry: EpisodeActionHistoryEntry, assigneeProfile?: UserProfileWithAvatar) =>
  render(
    <I18nProvider>
      <AlertEpisodeTimelineActionEvent entry={entry} assigneeProfile={assigneeProfile} />
    </I18nProvider>
  );

describe('AlertEpisodeTimelineActionEvent', () => {
  it('does not render assignee details for non-assign actions', () => {
    renderEvent(makeEntry({ action_type: 'ack', assignee_uid: null }));

    expect(screen.queryByTestId('alertingV2TimelineActionAssignee')).not.toBeInTheDocument();
  });

  it.each([
    ['ack', 'acknowledged the episode'],
    ['unack', 'unacknowledged the episode'],
    ['unsnooze', 'unsnoozed the episode'],
    ['deactivate', 'resolved the episode'],
    ['activate', 'reopened the episode'],
  ])('renders a complete sentence for the %s action', (actionType, sentence) => {
    renderEvent(makeEntry({ action_type: actionType }));

    expect(screen.getByText(sentence)).toBeInTheDocument();
  });

  it('falls back to the raw action type for unknown actions', () => {
    renderEvent(makeEntry({ action_type: 'teleport' }));

    expect(screen.getByText('teleport')).toBeInTheDocument();
  });

  it('names the assignee once when assignee_uid is set', () => {
    renderEvent(makeEntry({ action_type: 'assign', assignee_uid: 'user-2' }));

    expect(screen.getByTestId('alertingV2TimelineActionAssignee')).toHaveTextContent(
      'assigned the episode to user-2'
    );
  });

  it('uses the resolved profile name for the assignee', () => {
    renderEvent(makeEntry({ action_type: 'assign', assignee_uid: 'user-2' }), mockAssigneeProfile);

    // The avatar renders the assignee's initials next to their name
    expect(screen.getByTestId('alertingV2TimelineActionAssignee')).toHaveTextContent(
      'assigned the episode to JDJane Doe'
    );
  });

  it('renders the removed-assignee sentence when assignee_uid is null on an assign action', () => {
    renderEvent(makeEntry({ action_type: 'assign', assignee_uid: null }));

    expect(screen.getByTestId('alertingV2TimelineActionAssignee')).toHaveTextContent(
      'removed the assignee'
    );
    expect(screen.queryByText(/updated the assignee/)).not.toBeInTheDocument();
  });

  it('renders tags inline for tag actions', () => {
    renderEvent(makeEntry({ action_type: 'tag', tags: ['prod', 'db'] }));

    expect(screen.getByText('set the tags to')).toBeInTheDocument();
    expect(screen.getByText('prod')).toBeInTheDocument();
    expect(screen.getByText('db')).toBeInTheDocument();
  });

  it('renders every tag as its own badge so they wrap with the sentence', () => {
    const tags = ['one', 'two', 'three', 'four', 'five'];
    renderEvent(makeEntry({ action_type: 'tag', tags }));

    tags.forEach((tag) => expect(screen.getByText(tag)).toBeInTheDocument());
  });

  it('renders the removed-all-tags sentence when a tag action clears every tag', () => {
    renderEvent(makeEntry({ action_type: 'tag', tags: [] }));

    expect(screen.getByText('removed all tags')).toBeInTheDocument();
  });

  it('renders the snoozed-indefinitely sentence when snoozing without an expiry', () => {
    renderEvent(makeEntry({ action_type: 'snooze', expiry: null }));

    expect(screen.getByText('snoozed the episode indefinitely')).toBeInTheDocument();
  });

  it('renders the snooze duration and expiry when snoozing with an expiry', () => {
    renderEvent(
      makeEntry({
        action_type: 'snooze',
        '@timestamp': '2026-07-02T10:00:00.000Z',
        expiry: '2026-07-02T12:00:00.000Z',
      })
    );

    expect(screen.getByText(/^snoozed the episode for 2 hours, until /)).toBeInTheDocument();
  });

  it('omits the duration when the snooze expiry is not in the future', () => {
    renderEvent(
      makeEntry({
        action_type: 'snooze',
        '@timestamp': '2026-07-02T10:00:00.000Z',
        expiry: '2026-07-02T10:00:00.000Z',
      })
    );

    expect(screen.getByText(/^snoozed the episode until /)).toBeInTheDocument();
  });

  it('renders the reason as a suffix separated from the sentence', () => {
    renderEvent(makeEntry({ action_type: 'deactivate', reason: 'Handled by on-call' }));

    expect(screen.getByText('resolved the episode')).toBeInTheDocument();
    expect(screen.getByTestId('alertingV2TimelineActionReason')).toHaveTextContent(
      '· Handled by on-call'
    );
  });

  it('does not render a reason element when the entry has no reason', () => {
    renderEvent(makeEntry({ action_type: 'deactivate', reason: null }));

    expect(screen.queryByTestId('alertingV2TimelineActionReason')).not.toBeInTheDocument();
  });
});
