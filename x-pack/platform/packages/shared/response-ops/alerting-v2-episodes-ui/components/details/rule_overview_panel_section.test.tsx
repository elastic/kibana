/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { runEsqlAsyncSearch } from '../../utils/run_esql_async_search';
import { createQueryClientWrapper, createTestQueryClient } from '../../hooks/test_utils';
import { AlertEpisodeRuleOverviewPanelSection } from './rule_overview_panel_section';
import type { AlertEpisodeDetailsServices } from './types';

jest.mock('../../utils/run_esql_async_search');

const runEsqlAsyncSearchMock = jest.mocked(runEsqlAsyncSearch);

const mockData = dataPluginMock.createStartContract();
const mockHttp = httpServiceMock.createStartContract();
const mockExpressions = {} as ExpressionsStart;
const mockUserProfile = {} as UserProfileService;

const mockServices: AlertEpisodeDetailsServices = {
  data: mockData,
  http: mockHttp,
  expressions: mockExpressions,
  userProfile: mockUserProfile,
};

const mockRule = {
  id: 'rule-1',
  enabled: true,
  kind: 'alerting',
  metadata: { name: 'Rule 1' },
  evaluation: { query: { base: 'FROM logs' } },
} as unknown as RuleResponse;

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);
const getRuleDetailsHref = (ruleId: string) => `/rules/${ruleId}`;

describe('AlertEpisodeRuleOverviewPanelSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('renders the rule overview panel once the rule loads', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue({
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: 'episode.status', type: 'keyword' },
        { name: 'rule.id', type: 'keyword' },
        { name: 'group_hash', type: 'keyword' },
      ],
      values: [['2024-01-01T00:00:00.000Z', ALERT_EPISODE_STATUS.ACTIVE, 'rule-1', 'gh-1']],
    });
    mockHttp.get.mockResolvedValueOnce(mockRule);

    render(
      <I18nProvider>
        <AlertEpisodeRuleOverviewPanelSection
          episodeId="ep-1"
          services={mockServices}
          getRuleDetailsHref={getRuleDetailsHref}
        />
      </I18nProvider>,
      { wrapper }
    );

    await waitFor(() =>
      expect(screen.getByTestId('alertingV2EpisodeDetailsRuleOverviewPanel')).toBeInTheDocument()
    );
  });

  it('renders a loading spinner while data is loading', () => {
    runEsqlAsyncSearchMock.mockImplementation(() => new Promise(() => {}));

    render(
      <I18nProvider>
        <AlertEpisodeRuleOverviewPanelSection
          episodeId="ep-1"
          services={mockServices}
          getRuleDetailsHref={getRuleDetailsHref}
        />
      </I18nProvider>,
      { wrapper }
    );

    expect(
      screen.getByTestId('alertingV2EpisodeRuleOverviewPanelSectionLoading')
    ).toBeInTheDocument();
  });

  it('renders an error state when the rule fails to load', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue({
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: 'episode.status', type: 'keyword' },
        { name: 'rule.id', type: 'keyword' },
        { name: 'group_hash', type: 'keyword' },
      ],
      values: [['2024-01-01T00:00:00.000Z', ALERT_EPISODE_STATUS.ACTIVE, 'rule-1', 'gh-1']],
    });
    mockHttp.get.mockRejectedValueOnce(new Error('boom'));

    render(
      <I18nProvider>
        <AlertEpisodeRuleOverviewPanelSection
          episodeId="ep-1"
          services={mockServices}
          getRuleDetailsHref={getRuleDetailsHref}
        />
      </I18nProvider>,
      { wrapper }
    );

    await waitFor(() =>
      expect(
        screen.getByTestId('alertingV2EpisodeRuleOverviewPanelSectionError')
      ).toBeInTheDocument()
    );
  });
});
