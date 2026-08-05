/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type { EpisodeEventRow } from '../../queries/episode_events_query';
import type { EpisodeActionHistoryEntry } from '../../queries/episode_actions_history_query';
import { useFetchEpisodeEventsQuery } from '../../hooks/use_fetch_episode_events_query';
import { useFetchEpisodeActionsHistoryQuery } from '../../hooks/use_fetch_episode_actions_history_query';
import { useBulkGetProfiles } from '../../hooks/use_bulk_get_profiles';
import { AlertEpisodeTimelineSection } from './timeline_section';

jest.mock('../../hooks/use_fetch_episode_events_query');
jest.mock('../../hooks/use_fetch_episode_actions_history_query');
jest.mock('../../hooks/use_bulk_get_profiles');

const mockUseFetchEvents = jest.mocked(useFetchEpisodeEventsQuery);
const mockUseFetchActionsHistory = jest.mocked(useFetchEpisodeActionsHistoryQuery);
const mockUseBulkGetProfiles = jest.mocked(useBulkGetProfiles);

const mockServices = {
  data: {} as never,
  spaces: {} as never,
  userProfile: {} as never,
};

const makeRow = (status: string, ts: string, severity: string | null = null): EpisodeEventRow => ({
  '@timestamp': ts,
  'episode.id': 'ep-1',
  'episode.status': status as EpisodeEventRow['episode.status'],
  'rule.id': 'rule-1',
  group_hash: 'hash-1',
  severity,
});

// pending -> (severity set to "high") -> active: 2 state-change entries + 1 severity-change entry.
const mockEventRows = [
  makeRow(ALERT_EPISODE_STATUS.PENDING, '2024-01-01T00:00:00.000Z'),
  makeRow(ALERT_EPISODE_STATUS.PENDING, '2024-01-01T00:00:30.000Z', 'high'),
  makeRow(ALERT_EPISODE_STATUS.ACTIVE, '2024-01-01T00:01:00.000Z', 'high'),
];

const mockAction: EpisodeActionHistoryEntry = {
  _id: 'action-1',
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
    <I18nProvider>
      <QueryClientProvider client={client}>
        <AlertEpisodeTimelineSection episodeId="ep-1" groupHash="hash-1" services={mockServices} />
      </QueryClientProvider>
    </I18nProvider>
  );
};

const mockEvents = (eventRows: EpisodeEventRow[], isLoading = false) =>
  mockUseFetchEvents.mockReturnValue({ data: eventRows, isLoading } as never);

const mockActions = (
  actions: EpisodeActionHistoryEntry[],
  isLoading = false,
  overrides: {
    hasNextPage?: boolean;
    isFetchingNextPage?: boolean;
    fetchNextPage?: () => void;
  } = {}
) =>
  mockUseFetchActionsHistory.mockReturnValue({
    entries: actions,
    isLoading,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    ...overrides,
  } as never);

beforeEach(() => {
  jest.clearAllMocks();
  mockUseBulkGetProfiles.mockReturnValue({ data: [], isLoading: false } as never);
  mockEvents(mockEventRows);
  mockActions([]);
});

describe('AlertEpisodeTimelineSection', () => {
  it('shows a spinner while loading actions', () => {
    mockActions([], true);
    renderSection();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows a spinner while loading events', () => {
    mockEvents(mockEventRows, true);
    renderSection();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows empty prompt when there are no events and no actions', () => {
    mockEvents([]);
    mockActions([]);
    renderSection();
    expect(screen.getByTestId('alertingV2TimelineSectionEmpty')).toBeInTheDocument();
  });

  it('renders one EuiComment per merged entry, newest first', () => {
    mockActions([mockAction]);
    renderSection();
    // 2 state-change entries + 1 severity-change entry + 1 action entry = 4 comments
    const comments = screen.getAllByTestId('alertingV2TimelineEntry');
    expect(comments).toHaveLength(4);
    expect(comments[0]).toHaveAttribute('data-timestamp', '2024-01-01T00:01:30.000Z');
  });

  it('shows "started the episode as" text for the initial state entry', () => {
    mockEvents([makeRow(ALERT_EPISODE_STATUS.PENDING, '2024-01-01T00:00:00.000Z')]);
    mockActions([]);
    renderSection();
    expect(screen.getByText(/started the episode as/i)).toBeInTheDocument();
  });

  it('shows "changed the status to" text for subsequent transitions', () => {
    mockActions([]);
    renderSection();
    expect(screen.getByText(/changed the status to/i)).toBeInTheDocument();
  });

  it('shows "set the severity to" text for the initial severity entry', () => {
    mockActions([]);
    renderSection();
    expect(screen.getByText(/set the severity to/i)).toBeInTheDocument();
  });

  it('shows the action label for action entries', () => {
    mockEvents([]);
    mockActions([mockAction]);
    renderSection();
    expect(screen.getByText('acknowledged the episode')).toBeInTheDocument();
  });

  it('falls back to "system" username when actor is null', () => {
    mockEvents([]);
    mockActions([{ ...mockAction, actor: null }]);
    renderSection();
    expect(screen.getAllByText('system').length).toBeGreaterThan(0);
  });

  it('hides the load-more button when there are no more action pages', () => {
    mockEvents([]);
    mockActions([mockAction], false, { hasNextPage: false });
    renderSection();
    expect(screen.queryByTestId('alertingV2TimelineLoadMore')).not.toBeInTheDocument();
  });

  it('calls fetchNextPage when the load-more button is clicked', () => {
    const fetchNextPage = jest.fn();
    mockEvents([]);
    mockActions([mockAction], false, { hasNextPage: true, fetchNextPage });
    renderSection();
    fireEvent.click(screen.getByTestId('alertingV2TimelineLoadMore'));
    expect(fetchNextPage).toHaveBeenCalled();
  });

  it('disables the load-more button while fetching the next page', () => {
    mockEvents([]);
    mockActions([mockAction], false, { hasNextPage: true, isFetchingNextPage: true });
    renderSection();
    expect(screen.getByTestId('alertingV2TimelineLoadMore')).toBeDisabled();
  });
});
