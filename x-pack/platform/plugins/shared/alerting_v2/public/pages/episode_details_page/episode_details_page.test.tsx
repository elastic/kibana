/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { MockChromeContextProvider } from '@kbn/core-chrome-browser-context-mocks';
import { useParams } from 'react-router-dom';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { useFetchEpisodeQuery } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_episode_query';
import { useFetchEpisodeActions } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_episode_actions';
import { useFetchGroupActions } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_group_actions';
import { useFetchRule } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_rule';
import { RuleStateStatus } from '@kbn/alerting-v2-episodes-ui/types/rule_state';
import { createEpisodeActions } from '@kbn/alerting-v2-episodes-ui/actions';
import { TestProviders } from '../../test_utils/test_providers';
import { EpisodeDetailsPage } from './episode_details_page';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({ push: jest.fn() }),
  useParams: jest.fn(),
}));

jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_fetch_episode_query', () => ({
  useFetchEpisodeQuery: jest.fn(),
}));

jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_fetch_episode_actions', () => ({
  useFetchEpisodeActions: jest.fn(),
}));

jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_fetch_group_actions', () => ({
  useFetchGroupActions: jest.fn(),
}));

jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_fetch_rule', () => ({
  useFetchRule: jest.fn(),
}));

jest.mock('@kbn/alerting-v2-episodes-ui/actions', () => ({
  createEpisodeActions: jest.fn(),
}));

// Sections that call useFetchEpisodeQuery independently are mocked to keep the
// test focused on the page-level layout and sidebar.
jest.mock('@kbn/alerting-v2-episodes-ui/components/details/overview_list_section', () => ({
  AlertEpisodeOverviewListSection: () => <div data-test-subj="stubOverviewListSection" />,
}));

jest.mock('@kbn/alerting-v2-episodes-ui/components/details/related_section', () => ({
  AlertEpisodesRelatedSection: () => null,
}));

jest.mock('@kbn/alerting-v2-episodes-ui/components/details/rule_overview_panel_section', () => ({
  AlertEpisodeRuleOverviewPanelSection: () => <div data-test-subj="stubRuleOverviewPanelSection" />,
}));

jest.mock('@kbn/alerting-v2-episodes-ui/components/details/runbook_section', () => ({
  AlertEpisodeRunbookSection: () => <div data-test-subj="stubRunbookSection" />,
}));

jest.mock('@kbn/alerting-v2-episodes-ui/components/details/trend_chart_section', () => ({
  AlertEpisodeTrendChartSection: () => <div data-test-subj="stubTrendChartSection" />,
}));

jest.mock('@kbn/alerting-v2-episodes-ui/components/details/lifecycle_heatmap_section', () => ({
  AlertEpisodeLifecycleHeatmapSection: () => <div data-test-subj="stubLifecycleHeatmapSection" />,
}));

jest.mock('@kbn/alerting-v2-episodes-ui/components/details/severity_heatmap_section', () => ({
  AlertEpisodeSeverityHeatmapSection: () => <div data-test-subj="stubSeverityHeatmapSection" />,
}));

jest.mock('@kbn/alerting-v2-episodes-ui/components/details/metadata_section', () => ({
  AlertEpisodeMetadataSection: () => <div data-test-subj="stubMetadataSection" />,
}));

jest.mock('../../hooks/use_breadcrumbs', () => ({
  useBreadcrumbs: jest.fn(),
}));

const mockUseParams = jest.mocked(useParams);
const mockUseFetchEpisodeQuery = jest.mocked(useFetchEpisodeQuery);
const mockUseFetchEpisodeActions = jest.mocked(useFetchEpisodeActions);
const mockUseFetchGroupActions = jest.mocked(useFetchGroupActions);
const mockUseFetchRule = jest.mocked(useFetchRule);
const mockCreateEpisodeActions = jest.mocked(createEpisodeActions);

type EpisodeQueryResult = ReturnType<typeof useFetchEpisodeQuery>;
type FetchRuleResult = ReturnType<typeof useFetchRule>;

const mockEpisode = {
  '@timestamp': '2026-05-08T08:00:00.000Z',
  'episode.id': 'ep-1',
  'episode.status': 'active' as const,
  'rule.id': 'rule-1',
  group_hash: 'group-1',
  first_timestamp: '2026-05-08T08:00:00.000Z',
  last_timestamp: '2026-05-08T08:05:00.000Z',
  triggered_at: '2026-05-08T08:00:00.000Z',
  duration: 300000,
  last_tags: ['tag-a'],
  last_assignee_uid: 'u-1',
};

const episodeQuery = {
  data: mockEpisode,
  isLoading: false,
  isError: false,
  fetchStatus: 'idle',
} as unknown as EpisodeQueryResult;

const fetchRuleResult = {
  data: {
    id: 'rule-1',
    kind: 'alerting',
    enabled: true,
    metadata: { name: 'Rule A', description: 'Rule description' },
    grouping: { fields: ['host.name'] },
    query: { format: 'standalone', breach: 'from index-*' },
    artifacts: [],
  },
  isLoading: false,
  ruleState: {
    status: RuleStateStatus.loaded,
    ruleId: 'rule-1',
    rule: {
      id: 'rule-1',
      kind: 'alerting',
      enabled: true,
      metadata: { name: 'Rule A', description: 'Rule description' },
      grouping: { fields: ['host.name'] },
      evaluation: { query: { base: 'from index-*' } },
      artifacts: [],
    },
  },
} as unknown as FetchRuleResult;

const episodeId = 'ep-1';

const renderPage = () =>
  render(
    <MockChromeContextProvider>
      <TestProviders>
        <MemoryRouter>
          <EpisodeDetailsPage />
        </MemoryRouter>
      </TestProviders>
    </MockChromeContextProvider>
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockUseParams.mockReturnValue({ episodeId });
  mockUseFetchEpisodeQuery.mockReturnValue(episodeQuery);
  mockUseFetchRule.mockReturnValue(fetchRuleResult);
  mockUseFetchEpisodeActions.mockReturnValue({
    data: new Map([
      [
        episodeId,
        {
          episodeId,
          ruleId: 'rule-1',
          groupHash: 'group-1',
          lastAckAction: ALERT_EPISODE_ACTION_TYPE.ACK,
          lastAssigneeUid: 'u-1',
          lastAckActor: null,
        },
      ],
    ]),
  } as ReturnType<typeof useFetchEpisodeActions>);
  mockUseFetchGroupActions.mockReturnValue({
    data: new Map([
      [
        'group-1',
        {
          groupHash: 'group-1',
          ruleId: 'rule-1',
          lastDeactivateAction: null,
          lastSnoozeAction: null,
          snoozeExpiry: null,
          tags: [],
          lastSnoozeActor: null,
          lastDeactivateActor: null,
        },
      ],
    ]),
  } as unknown as ReturnType<typeof useFetchGroupActions>);
  mockCreateEpisodeActions.mockReturnValue([
    {
      id: 'ALERTING_V2_ACK_EPISODE',
      order: 10,
      displayName: 'Acknowledge',
      iconType: 'checkCircle',
      isCompatible: () => true,
      execute: jest.fn(async () => {}),
    },
    {
      id: 'ALERTING_V2_EDIT_EPISODE_TAGS',
      order: 40,
      displayName: 'Edit tags',
      iconType: 'tag',
      isCompatible: () => true,
      execute: jest.fn(async () => {}),
    },
  ]);
});

describe('EpisodeDetailsPage', () => {
  it('renders the page structure once the episode loads', () => {
    renderPage();

    expect(screen.getByTestId('alertingV2EpisodeDetailsPage')).toBeInTheDocument();
    expect(screen.getByTestId('alertingV2EpisodeDetailsSidebar')).toBeInTheDocument();
    expect(screen.getByTestId('stubLifecycleHeatmapSection')).toBeInTheDocument();
    expect(screen.getByTestId('stubSeverityHeatmapSection')).toBeInTheDocument();
  });

  it('renders the app header title, tabs, back link, and badges', () => {
    renderPage();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Rule A');
    expect(screen.getByTestId('alertingV2EpisodeDetailsMainTabOverview')).toBeInTheDocument();
    expect(screen.getByTestId('alertingV2EpisodeDetailsMainTabMetadata')).toBeInTheDocument();
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back)).toHaveAttribute(
      'href',
      '/app/management/alertingV2/episodes'
    );
    // Badge label/color mapping per status and severity is covered by get_episode_header_badges.test.ts;
    // this just proves the header is wired up to badges at all.
    expect(screen.getByTestId('alertingV2EpisodeDetailsHeaderStatusBadge')).toHaveTextContent(
      'Active'
    );
  });

  it('renders the rule description in the header area', () => {
    renderPage();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.metadata)).toBeInTheDocument();
    expect(screen.getByTestId('alertingV2EpisodeDetailsHeaderDescription')).toHaveTextContent(
      'Rule description'
    );
  });

  it('omits the header metadata row when the rule has no description', () => {
    const loadedRuleState = fetchRuleResult.ruleState as unknown as {
      status: RuleStateStatus;
      ruleId: string;
      rule: { metadata: Record<string, unknown> };
    };

    mockUseFetchRule.mockReturnValue({
      ...fetchRuleResult,
      ruleState: {
        ...loadedRuleState,
        rule: {
          ...loadedRuleState.rule,
          metadata: { ...loadedRuleState.rule.metadata, description: undefined },
        },
      },
    } as unknown as FetchRuleResult);

    renderPage();

    expect(screen.queryByTestId(APP_HEADER_TEST_SUBJECTS.metadata)).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('alertingV2EpisodeDetailsHeaderDescription')
    ).not.toBeInTheDocument();
  });

  it('hides the metadata tab when the rule is not loaded', () => {
    mockUseFetchRule.mockReturnValue({
      ...fetchRuleResult,
      ruleState: {
        status: RuleStateStatus.loading,
        ruleId: 'rule-1',
      },
    } as unknown as FetchRuleResult);

    renderPage();

    expect(screen.getByTestId('alertingV2EpisodeDetailsMainTabOverview')).toBeInTheDocument();
    expect(screen.queryByTestId('alertingV2EpisodeDetailsMainTabMetadata')).not.toBeInTheDocument();
  });

  it('renders episode actions in the app header menu', async () => {
    renderPage();

    await openAppMenuOverflow();

    expect(
      await screen.findByTestId('episodeActionsBar-primary-ALERTING_V2_ACK_EPISODE')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('episodeActionsBar-overflow-ALERTING_V2_EDIT_EPISODE_TAGS')
    ).toBeInTheDocument();
  });

  it('runs an app header menu action when clicked', async () => {
    const execute = jest.fn(async () => {});
    mockCreateEpisodeActions.mockReturnValue([
      {
        id: 'ALERTING_V2_ACK_EPISODE',
        order: 10,
        displayName: 'Acknowledge',
        iconType: 'checkCircle',
        isCompatible: () => true,
        execute,
      },
    ]);

    renderPage();

    await openAppMenuOverflow();
    await userEvent.click(
      await screen.findByTestId('episodeActionsBar-primary-ALERTING_V2_ACK_EPISODE')
    );

    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        episodes: [mockEpisode],
      })
    );
  });

  it('renders the not-found prompt when there is no episode', () => {
    mockUseFetchEpisodeQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      fetchStatus: 'idle',
    } as unknown as EpisodeQueryResult);

    renderPage();

    expect(screen.getByTestId('episodeDetailsErrorPrompt')).toBeInTheDocument();
  });

  it('renders the error prompt when the episode query errors', () => {
    mockUseFetchEpisodeQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      fetchStatus: 'idle',
    } as unknown as EpisodeQueryResult);

    renderPage();

    expect(screen.getByTestId('episodeDetailsErrorPrompt')).toBeInTheDocument();
  });
});
