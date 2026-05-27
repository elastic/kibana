/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { useParams } from 'react-router-dom';
import { useFetchEpisodeEventsQuery } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_episode_events_query';
import { useFetchEpisodeActions } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_episode_actions';
import { useFetchGroupActions } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_group_actions';
import { useFetchEpisodeEventDataQuery } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_episode_event_data_query';
import { useFetchRule } from '../../hooks/use_fetch_rule';
import { TestProviders } from '../../test_utils/test_providers';
import { EpisodeDetailsPage } from './episode_details_page';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({ push: jest.fn() }),
  useParams: jest.fn(),
}));

jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_fetch_episode_events_query', () => ({
  useFetchEpisodeEventsQuery: jest.fn(),
}));

jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_fetch_episode_actions', () => ({
  useFetchEpisodeActions: jest.fn(),
}));

jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_fetch_group_actions', () => ({
  useFetchGroupActions: jest.fn(),
}));

jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_fetch_episode_event_data_query', () => ({
  useFetchEpisodeEventDataQuery: jest.fn(),
}));

jest.mock('../../hooks/use_fetch_rule', () => ({
  useFetchRule: jest.fn(),
}));

jest.mock('../../hooks/use_breadcrumbs', () => ({
  useBreadcrumbs: jest.fn(),
}));

jest.mock('./components/episode_overview_tab', () => ({
  // helps with the slow render
  EpisodeOverviewTab: () => <div data-test-subj="mockEpisodeOverviewTab" />,
}));

jest.mock('./components/episode_metadata_tab', () => ({
  // helps with the slow render
  EpisodeMetadataTab: () => <div data-test-subj="mockEpisodeMetadataTab" />,
}));

const mockUseParams = jest.mocked(useParams);
const mockUseFetchEpisodeEventsQuery = jest.mocked(useFetchEpisodeEventsQuery);
const mockUseFetchEpisodeActions = jest.mocked(useFetchEpisodeActions);
const mockUseFetchGroupActions = jest.mocked(useFetchGroupActions);
const mockUseFetchEpisodeEventDataQuery = jest.mocked(useFetchEpisodeEventDataQuery);
const mockUseFetchRule = jest.mocked(useFetchRule);

type EpisodeEventsQueryResult = ReturnType<typeof useFetchEpisodeEventsQuery>;
type EpisodeActionsQueryResult = ReturnType<typeof useFetchEpisodeActions>;
type GroupActionsQueryResult = ReturnType<typeof useFetchGroupActions>;
type EpisodeEventDataQueryResult = ReturnType<typeof useFetchEpisodeEventDataQuery>;
type FetchRuleResult = ReturnType<typeof useFetchRule>;

const eventsQuery = {
  data: [
    {
      '@timestamp': '2026-05-08T08:00:00.000Z',
      'episode.id': 'ep-1',
      'episode.status': 'active',
      'rule.id': 'rule-1',
      group_hash: 'group-1',
      first_timestamp: '2026-05-08T08:00:00.000Z',
      last_timestamp: '2026-05-08T08:05:00.000Z',
    },
  ],
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
} as unknown as EpisodeEventsQueryResult;

const episodeActionsQuery = {
  data: new Map([['ep-1', { lastAssigneeUid: 'u-1' }]]),
  refetch: jest.fn(),
} as unknown as EpisodeActionsQueryResult;

const groupActionsQuery = {
  data: new Map([['group-1', { tags: ['tag-a'] }]]),
  refetch: jest.fn(),
} as unknown as GroupActionsQueryResult;

const eventDataQuery = {
  data: { data: { 'host.name': 'host-1' } },
  refetch: jest.fn(),
} as unknown as EpisodeEventDataQueryResult;

const fetchRuleResult = {
  data: {
    id: 'rule-1',
    kind: 'alerting',
    enabled: true,
    metadata: { name: 'Rule A', description: 'Rule description' },
    grouping: { fields: ['host.name'] },
    evaluation: { query: { base: 'from index-*' } },
    artifacts: [],
  },
  isLoading: false,
} as unknown as FetchRuleResult;

const episodeId = 'ep-1';
mockUseParams.mockReturnValue({ episodeId });
mockUseFetchEpisodeEventsQuery.mockReturnValue(eventsQuery);
mockUseFetchEpisodeActions.mockReturnValue(episodeActionsQuery);
mockUseFetchGroupActions.mockReturnValue(groupActionsQuery);
mockUseFetchEpisodeEventDataQuery.mockReturnValue(eventDataQuery);
mockUseFetchRule.mockReturnValue(fetchRuleResult);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('EpisodeDetailsPage', () => {
  it('renders sidebar content as expected', () => {
    render(
      <TestProviders>
        <EpisodeDetailsPage />
      </TestProviders>
    );

    expect(screen.getByTestId('alertingV2EpisodeDetailsSidebar')).toBeInTheDocument();
    expect(screen.getByText('Grouping fields')).toBeInTheDocument();
    expect(screen.getByText('Triggered')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('Assignee')).toBeInTheDocument();
  });
});
