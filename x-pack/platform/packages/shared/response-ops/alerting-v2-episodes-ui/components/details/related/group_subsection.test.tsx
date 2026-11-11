/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { AlertEpisode } from '@kbn/alerting-v2-schemas';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { RuleStateStatus, type LoadedRuleState } from '../../../types/rule_state';
import { RelatedEpisodesGroupSubsection } from './group_subsection';
import { useFetchEpisodesDataQuery } from '../../../hooks/use_fetch_episodes_data_query';
import { useFetchSameGroupEpisodesQuery } from '../../../hooks/use_fetch_same_group_episodes_query';
jest.mock('../../../hooks/use_fetch_same_group_episodes_query');

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      notifications: { toasts: { addDanger: jest.fn() } },
    },
  }),
}));

jest.mock('../../../hooks/use_fetch_episode_actions', () => ({
  useFetchEpisodeActions: () => ({ data: undefined }),
}));

jest.mock('../../../hooks/use_fetch_episodes_data_query', () => ({
  ...jest.requireActual('../../../hooks/use_fetch_episodes_data_query'),
  useFetchEpisodesDataQuery: jest.fn(() => ({ data: undefined })),
}));

jest.mock('../../../hooks/use_fetch_group_actions', () => ({
  useFetchGroupActions: () => ({ data: undefined }),
}));

jest.mock('./related_list', () => ({
  RelatedAlertEpisodesList: ({ rows }: { rows: AlertEpisode[] }) => (
    <div
      data-test-subj="mockEpisodesList"
      data-episode-data={rows.map((row) => row.episode_data ?? 'none').join(',')}
    >
      {rows.length} episodes
    </div>
  ),
}));

const mockUseFetch = jest.mocked(useFetchSameGroupEpisodesQuery);
const mockUseFetchEpisodesData = jest.mocked(useFetchEpisodesDataQuery);

const loadedRuleState: LoadedRuleState = {
  status: RuleStateStatus.loaded,
  ruleId: 'rule-1',
  rule: { id: 'rule-1', metadata: { name: 'Test Rule' } } as RuleResponse,
};

const mockRuleProps = {
  ruleState: loadedRuleState,
  scope: { type: 'rule' as const, ruleId: 'rule-1' },
};
const mockGetEpisodeDetailsHref = (id: string) => `/base/${id}`;

describe('RelatedEpisodesGroupSubsection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders as expected when episodes are returned', () => {
    const episode = {
      'episode.id': 'ep-2',
      'episode.status': 'active',
      'rule.id': 'rule-1',
      group_hash: 'gh-1',
    } as AlertEpisode;

    mockUseFetch.mockReturnValue({ data: [episode], isLoading: false } as any);

    render(
      <I18nProvider>
        <RelatedEpisodesGroupSubsection
          currentEpisodeId="ep-1"
          groupHash="gh-1"
          {...mockRuleProps}
          getEpisodeDetailsHref={mockGetEpisodeDetailsHref}
        />
      </I18nProvider>
    );
    expect(screen.getByText('Same alert group')).toBeInTheDocument();
    expect(screen.getByTestId('mockEpisodesList')).toBeInTheDocument();
    expect(screen.getByText('1 episodes')).toBeInTheDocument();
  });

  it('keeps the subsection title as a heading when compressed', () => {
    mockUseFetch.mockReturnValue({ data: [], isLoading: false } as any);

    render(
      <I18nProvider>
        <RelatedEpisodesGroupSubsection
          currentEpisodeId="ep-1"
          groupHash="gh-1"
          {...mockRuleProps}
          getEpisodeDetailsHref={mockGetEpisodeDetailsHref}
          compressed
        />
      </I18nProvider>
    );

    expect(screen.getByRole('heading', { level: 4, name: 'Same alert group' })).toBeInTheDocument();
  });

  it('shows a loading spinner while fetching', () => {
    mockUseFetch.mockReturnValue({ data: [], isLoading: true } as any);

    render(
      <I18nProvider>
        <RelatedEpisodesGroupSubsection
          currentEpisodeId="ep-1"
          groupHash="gh-1"
          {...mockRuleProps}
          getEpisodeDetailsHref={mockGetEpisodeDetailsHref}
        />
      </I18nProvider>
    );

    expect(
      screen
        .getByTestId('alertingV2RelatedEpisodesGroupLoading')
        .querySelector('.euiSkeletonRectangle')
    ).not.toBeNull();
  });

  it('shows the empty state when there are no episodes', () => {
    mockUseFetch.mockReturnValue({ data: [], isLoading: false } as any);

    render(
      <I18nProvider>
        <RelatedEpisodesGroupSubsection
          currentEpisodeId="ep-1"
          groupHash="gh-1"
          {...mockRuleProps}
          getEpisodeDetailsHref={mockGetEpisodeDetailsHref}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('alertingV2RelatedEpisodesGroupEmpty')).toBeInTheDocument();
    expect(screen.getByText('No other alerts in this group.')).toBeInTheDocument();
  });

  it('describes the group by source when the episode has no rule', () => {
    mockUseFetch.mockReturnValue({ data: [], isLoading: false } as any);

    render(
      <I18nProvider>
        <RelatedEpisodesGroupSubsection
          currentEpisodeId="ep-1"
          groupHash="gh-1"
          ruleState={{ status: RuleStateStatus.idle }}
          scope={{ type: 'source', source: 'zabbix' }}
          getEpisodeDetailsHref={mockGetEpisodeDetailsHref}
        />
      </I18nProvider>
    );

    expect(
      screen.getByText('Other alerts from this source that share the same group as this alert.')
    ).toBeInTheDocument();
    expect(mockUseFetch).toHaveBeenCalledWith(
      expect.objectContaining({ scope: { type: 'source', source: 'zabbix' } })
    );
  });

  it('adds the data of the episodes once it loads, to show their grouping', () => {
    const mockEpisodes = [{ 'episode.id': 'ep-2' }, { 'episode.id': 'ep-3' }] as AlertEpisode[];
    mockUseFetch.mockReturnValue({ data: mockEpisodes, isLoading: false } as any);
    mockUseFetchEpisodesData.mockReturnValue({
      data: new Map([['ep-2', '{"host":"web-01"}']]),
    } as any);

    render(
      <I18nProvider>
        <RelatedEpisodesGroupSubsection
          currentEpisodeId="ep-1"
          groupHash="gh-1"
          {...mockRuleProps}
          getEpisodeDetailsHref={mockGetEpisodeDetailsHref}
        />
      </I18nProvider>
    );

    expect(mockUseFetchEpisodesData).toHaveBeenLastCalledWith(
      expect.objectContaining({ episodeIds: ['ep-2', 'ep-3'] })
    );
    expect(screen.getByTestId('mockEpisodesList')).toHaveAttribute(
      'data-episode-data',
      '{"host":"web-01"},none'
    );
  });

  it('shows the episodes without their data when the data lookup fails', () => {
    const mockEpisodes = [{ 'episode.id': 'ep-2' }] as AlertEpisode[];
    mockUseFetch.mockReturnValue({ data: mockEpisodes, isLoading: false } as any);
    mockUseFetchEpisodesData.mockReturnValue({ data: undefined, isError: true } as any);

    render(
      <I18nProvider>
        <RelatedEpisodesGroupSubsection
          currentEpisodeId="ep-1"
          groupHash="gh-1"
          {...mockRuleProps}
          getEpisodeDetailsHref={mockGetEpisodeDetailsHref}
        />
      </I18nProvider>
    );

    expect(screen.getByText('1 episodes')).toBeInTheDocument();
    expect(screen.getByTestId('mockEpisodesList')).toHaveAttribute('data-episode-data', 'none');
  });
});
