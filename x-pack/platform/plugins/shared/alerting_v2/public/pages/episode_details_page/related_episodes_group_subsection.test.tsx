/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import type { AlertEpisode } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import { RelatedEpisodesGroupSubsection } from './related_episodes_group_subsection';
import { useFetchSameGroupEpisodesQuery } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_same_group_episodes_query';
jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_fetch_same_group_episodes_query');

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      notifications: { toasts: { addDanger: jest.fn() } },
    },
  }),
}));

jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_fetch_episode_actions', () => ({
  useFetchEpisodeActions: () => ({ data: undefined }),
}));

jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_fetch_group_actions', () => ({
  useFetchGroupActions: () => ({ data: undefined }),
}));

jest.mock('./related_alert_episodes_list', () => ({
  RelatedAlertEpisodesList: ({ rows }: { rows: AlertEpisode[] }) => (
    <div data-test-subj="mockEpisodesList">{rows.length} episodes</div>
  ),
}));

const mockUseFetch = jest.mocked(useFetchSameGroupEpisodesQuery);

const mockRule = { id: 'rule-1', metadata: { name: 'Test Rule' } } as RuleResponse;

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
          rule={mockRule}
          ruleId="rule-1"
        />
      </I18nProvider>
    );
    expect(screen.getByText('Same alert group')).toBeInTheDocument();
    expect(screen.getByTestId('mockEpisodesList')).toBeInTheDocument();
    expect(screen.getByText('1 episodes')).toBeInTheDocument();
  });

  it('shows a loading spinner while fetching', () => {
    mockUseFetch.mockReturnValue({ data: [], isLoading: true } as any);

    render(
      <I18nProvider>
        <RelatedEpisodesGroupSubsection
          currentEpisodeId="ep-1"
          groupHash="gh-1"
          rule={mockRule}
          ruleId="rule-1"
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('alertingV2RelatedEpisodesGroupLoading')).toBeInTheDocument();
  });

  it('shows the empty state when there are no episodes', () => {
    mockUseFetch.mockReturnValue({ data: [], isLoading: false } as any);

    render(
      <I18nProvider>
        <RelatedEpisodesGroupSubsection
          currentEpisodeId="ep-1"
          groupHash="gh-1"
          rule={mockRule}
          ruleId="rule-1"
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('alertingV2RelatedEpisodesGroupEmpty')).toBeInTheDocument();
    expect(screen.getByText('No other episodes in this group.')).toBeInTheDocument();
  });
});
