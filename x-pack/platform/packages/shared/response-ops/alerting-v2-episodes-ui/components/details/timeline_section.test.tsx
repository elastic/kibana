/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type { EpisodeStateTransitionRow } from '../../queries/episode_state_transitions_query';
import type { EpisodeSeverityTransitionRow } from '../../queries/episode_severity_transitions_query';
import type { EpisodeActionHistoryEntry } from '../../queries/episode_actions_history_query';
import { useFetchEpisodeStateTransitionsQuery } from '../../hooks/use_fetch_episode_state_transitions_query';
import { useFetchEpisodeSeverityTransitionsQuery } from '../../hooks/use_fetch_episode_severity_transitions_query';
import { useFetchEpisodeActionsHistoryQuery } from '../../hooks/use_fetch_episode_actions_history_query';
import { useBulkGetProfiles } from '../../hooks/use_bulk_get_profiles';
import { AlertEpisodeTimelineSection } from './timeline_section';

jest.mock('../../hooks/use_fetch_episode_state_transitions_query');
jest.mock('../../hooks/use_fetch_episode_severity_transitions_query');
jest.mock('../../hooks/use_fetch_episode_actions_history_query');
jest.mock('../../hooks/use_bulk_get_profiles');

const mockUseFetchStateTransitions = jest.mocked(useFetchEpisodeStateTransitionsQuery);
const mockUseFetchSeverityTransitions = jest.mocked(useFetchEpisodeSeverityTransitionsQuery);
const mockUseFetchActionsHistory = jest.mocked(useFetchEpisodeActionsHistoryQuery);
const mockUseBulkGetProfiles = jest.mocked(useBulkGetProfiles);

const mockServices = {
  data: {} as never,
  spaces: {} as never,
  userProfile: {} as never,
};

const makeRow = (status: string, ts: string): EpisodeStateTransitionRow => ({
  '@timestamp': ts,
  'episode.status': status as EpisodeStateTransitionRow['episode.status'],
  event_count: 1,
});

const mockEventRows = [
  makeRow(ALERT_EPISODE_STATUS.PENDING, '2024-01-01T00:00:00.000Z'),
  makeRow(ALERT_EPISODE_STATUS.ACTIVE, '2024-01-01T00:01:00.000Z'),
];

const mockSeverityRows: EpisodeSeverityTransitionRow[] = [
  {
    '@timestamp': '2024-01-01T00:00:30.000Z',
    severity: 'high',
    event_count: 1,
  },
];

const mockAction: EpisodeActionHistoryEntry = {
  '@timestamp': '2024-01-01T00:01:30.000Z',
  action_type: 'ack',
  actor: 'user-uid-1',
  episode_id: 'ep-1',
  group_hash: 'hash-1',
  tags: null,
  assignee_uid: null,
  expiry: null,
  reason: null,
};

const renderSection = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AlertEpisodeTimelineSection episodeId="ep-1" groupHash="hash-1" services={mockServices} />
    </QueryClientProvider>
  );
};

const mockStateTransitions = (eventRows: EpisodeStateTransitionRow[], isLoading = false) =>
  mockUseFetchStateTransitions.mockReturnValue({ data: eventRows, isLoading } as never);

const mockSeverityTransitions = (eventRows: EpisodeSeverityTransitionRow[], isLoading = false) =>
  mockUseFetchSeverityTransitions.mockReturnValue({ data: eventRows, isLoading } as never);

const mockActions = (actions: EpisodeActionHistoryEntry[], isLoading = false) =>
  mockUseFetchActionsHistory.mockReturnValue({ data: actions, isLoading } as never);

beforeEach(() => {
  jest.clearAllMocks();
  mockUseBulkGetProfiles.mockReturnValue({ data: [], isLoading: false } as never);
  mockStateTransitions(mockEventRows);
  mockSeverityTransitions(mockSeverityRows);
  mockActions([]);
});

describe('AlertEpisodeTimelineSection', () => {
  it('shows a spinner while loading actions', () => {
    mockActions([], true);
    renderSection();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows a spinner while loading state transitions', () => {
    mockStateTransitions(mockEventRows, true);
    renderSection();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows a spinner while loading severity transitions', () => {
    mockSeverityTransitions(mockSeverityRows, true);
    renderSection();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows empty prompt when there are no events and no actions', () => {
    mockStateTransitions([]);
    mockSeverityTransitions([]);
    mockActions([]);
    renderSection();
    expect(screen.getByTestId('alertingV2TimelineSectionEmpty')).toBeInTheDocument();
  });

  it('renders one EuiComment per merged entry, newest first', () => {
    mockStateTransitions(mockEventRows);
    mockSeverityTransitions(mockSeverityRows);
    mockActions([mockAction]);
    renderSection();
    // 2 state-change entries + 1 severity-change entry + 1 action entry = 4 comments
    const comments = screen.getAllByTestId('alertingV2TimelineEntry');
    expect(comments).toHaveLength(4);
    expect(comments[0]).toHaveAttribute('data-timestamp', '2024-01-01T00:01:30.000Z');
  });

  it('shows "Episode started" text for the initial state entry', () => {
    mockStateTransitions([makeRow(ALERT_EPISODE_STATUS.PENDING, '2024-01-01T00:00:00.000Z')]);
    mockActions([]);
    renderSection();
    expect(screen.getByText(/Episode started/i)).toBeInTheDocument();
  });

  it('shows "Episode status changed" text for subsequent transitions', () => {
    mockStateTransitions(mockEventRows);
    mockActions([]);
    renderSection();
    expect(screen.getByText(/Episode status changed/i)).toBeInTheDocument();
  });

  it('shows "Episode severity set" text for the initial severity entry', () => {
    mockStateTransitions([]);
    mockSeverityTransitions(mockSeverityRows);
    mockActions([]);
    renderSection();
    expect(screen.getByText(/Episode severity set/i)).toBeInTheDocument();
  });

  it('shows the action label for action entries', () => {
    mockStateTransitions([]);
    mockActions([mockAction]);
    renderSection();
    expect(screen.getByText('acknowledged on')).toBeInTheDocument();
  });

  it('falls back to "system" username when actor is null', () => {
    mockStateTransitions([]);
    mockActions([{ ...mockAction, actor: null }]);
    renderSection();
    expect(screen.getAllByText('system').length).toBeGreaterThan(0);
  });
});
