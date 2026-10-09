/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { runEsqlAsyncSearch } from '../../utils/run_esql_async_search';
import { fetchEpisodeActions } from '../../apis/fetch_episode_actions';
import { fetchGroupActions } from '../../apis/fetch_group_actions';
import {
  createMockServices,
  createQueryClientWrapper,
  createTestQueryClient,
} from '../../hooks/test_utils';
import { AlertEpisodeOverviewListSection } from './overview_list_section';

jest.mock('../../utils/run_esql_async_search');
jest.mock('../../apis/fetch_episode_actions');
jest.mock('../../apis/fetch_group_actions');

const runEsqlAsyncSearchMock = jest.mocked(runEsqlAsyncSearch);
const fetchEpisodeActionsMock = jest.mocked(fetchEpisodeActions);
const fetchGroupActionsMock = jest.mocked(fetchGroupActions);

const mockHttp = httpServiceMock.createStartContract();
const mockServices = createMockServices({ http: mockHttp });

const mockRule = {
  id: 'rule-1',
  metadata: { name: 'My rule' },
  grouping: { fields: ['service.name', 'host.name'] },
} as unknown as RuleResponse;

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

describe('AlertEpisodeOverviewListSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('renders the overview list once all data is loaded', async () => {
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
    fetchEpisodeActionsMock.mockResolvedValue([]);
    fetchGroupActionsMock.mockResolvedValue([]);

    render(
      <I18nProvider>
        <AlertEpisodeOverviewListSection
          episodeId="ep-1"
          groupHash="gh-1"
          services={mockServices}
        />
      </I18nProvider>,
      { wrapper }
    );

    await waitFor(() =>
      expect(screen.getByTestId('alertingV2EpisodeDetailsOverviewList')).toBeInTheDocument()
    );
  });

  it('renders the loading state while data is loading', () => {
    runEsqlAsyncSearchMock.mockImplementation(() => new Promise(() => {}));
    fetchEpisodeActionsMock.mockImplementation(() => new Promise(() => {}));
    fetchGroupActionsMock.mockImplementation(() => new Promise(() => {}));

    render(
      <I18nProvider>
        <AlertEpisodeOverviewListSection
          episodeId="ep-1"
          groupHash="gh-1"
          services={mockServices}
        />
      </I18nProvider>,
      { wrapper }
    );

    expect(screen.getByTestId('alertingV2EpisodeOverviewListSectionLoading')).toBeInTheDocument();
  });

  it('does not wait on group actions when groupHash is undefined', async () => {
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
    fetchEpisodeActionsMock.mockResolvedValue([]);
    fetchGroupActionsMock.mockImplementation(() => new Promise(() => {}));

    render(
      <I18nProvider>
        <AlertEpisodeOverviewListSection
          episodeId="ep-1"
          groupHash={undefined}
          services={mockServices}
        />
      </I18nProvider>,
      { wrapper }
    );

    await waitFor(() =>
      expect(screen.getByTestId('alertingV2EpisodeDetailsOverviewList')).toBeInTheDocument()
    );
    expect(fetchGroupActionsMock).not.toHaveBeenCalled();
  });

  it('renders the error state when episode data fails to load', async () => {
    runEsqlAsyncSearchMock.mockRejectedValue(new Error('boom'));
    fetchEpisodeActionsMock.mockResolvedValue([]);
    fetchGroupActionsMock.mockResolvedValue([]);

    render(
      <I18nProvider>
        <AlertEpisodeOverviewListSection
          episodeId="ep-1"
          groupHash="gh-1"
          services={mockServices}
        />
      </I18nProvider>,
      { wrapper }
    );

    await waitFor(() =>
      expect(screen.getByTestId('alertingV2EpisodeOverviewListSectionError')).toBeInTheDocument()
    );
  });

  it('renders the error state when episode actions fail to load', async () => {
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
    fetchEpisodeActionsMock.mockRejectedValue(new Error('boom'));
    fetchGroupActionsMock.mockResolvedValue([]);

    render(
      <I18nProvider>
        <AlertEpisodeOverviewListSection
          episodeId="ep-1"
          groupHash="gh-1"
          services={mockServices}
        />
      </I18nProvider>,
      { wrapper }
    );

    await waitFor(() =>
      expect(screen.getByTestId('alertingV2EpisodeOverviewListSectionError')).toBeInTheDocument()
    );
  });

  it('still renders the overview list but hides the grouping row when the rule is forbidden (403)', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue({
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: 'episode.status', type: 'keyword' },
        { name: 'rule.id', type: 'keyword' },
        { name: 'group_hash', type: 'keyword' },
      ],
      values: [['2024-01-01T00:00:00.000Z', ALERT_EPISODE_STATUS.ACTIVE, 'rule-1', 'gh-1']],
    });
    mockHttp.get.mockRejectedValueOnce({
      response: { status: 403 },
      body: { code: 'FORBIDDEN', error: 'Forbidden', message: 'Forbidden' },
    });
    fetchEpisodeActionsMock.mockResolvedValue([]);
    fetchGroupActionsMock.mockResolvedValue([]);

    render(
      <I18nProvider>
        <AlertEpisodeOverviewListSection
          episodeId="ep-1"
          groupHash="gh-1"
          services={mockServices}
        />
      </I18nProvider>,
      { wrapper }
    );

    expect(await screen.findByTestId('alertingV2EpisodeDetailsOverviewList')).toBeInTheDocument();
    expect(screen.queryByText('Grouping')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('alertingV2EpisodeOverviewListSectionError')
    ).not.toBeInTheDocument();
  });

  it('still renders the overview list but hides the grouping row when the rule is not found (404)', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue({
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: 'episode.status', type: 'keyword' },
        { name: 'rule.id', type: 'keyword' },
        { name: 'group_hash', type: 'keyword' },
      ],
      values: [['2024-01-01T00:00:00.000Z', ALERT_EPISODE_STATUS.ACTIVE, 'rule-1', 'gh-1']],
    });
    mockHttp.get.mockRejectedValueOnce({
      response: { status: 404 },
      body: { code: 'RULE_NOT_FOUND', error: 'Not Found', message: 'Not Found' },
    });
    fetchEpisodeActionsMock.mockResolvedValue([]);
    fetchGroupActionsMock.mockResolvedValue([]);

    render(
      <I18nProvider>
        <AlertEpisodeOverviewListSection
          episodeId="ep-1"
          groupHash="gh-1"
          services={mockServices}
        />
      </I18nProvider>,
      { wrapper }
    );

    expect(await screen.findByTestId('alertingV2EpisodeDetailsOverviewList')).toBeInTheDocument();
    expect(screen.queryByText('Grouping')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('alertingV2EpisodeOverviewListSectionError')
    ).not.toBeInTheDocument();
  });

  it('shows an inline grouping error but keeps the list when the rule fails for a non-403/404 reason', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue({
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: 'episode.status', type: 'keyword' },
        { name: 'rule.id', type: 'keyword' },
        { name: 'group_hash', type: 'keyword' },
      ],
      values: [['2024-01-01T00:00:00.000Z', ALERT_EPISODE_STATUS.ACTIVE, 'rule-1', 'gh-1']],
    });
    mockHttp.get.mockRejectedValueOnce({
      response: { status: 500 },
      body: { code: 'INTERNAL', error: 'Internal Server Error', message: 'boom' },
    });
    fetchEpisodeActionsMock.mockResolvedValue([]);
    fetchGroupActionsMock.mockResolvedValue([]);

    render(
      <I18nProvider>
        <AlertEpisodeOverviewListSection
          episodeId="ep-1"
          groupHash="gh-1"
          services={mockServices}
        />
      </I18nProvider>,
      { wrapper }
    );

    expect(await screen.findByTestId('alertingV2EpisodeDetailsOverviewList')).toBeInTheDocument();
    // Grouping row is present but shows an inline error instead of tags.
    expect(screen.getByText('Grouping')).toBeInTheDocument();
    expect(
      screen.getByTestId('alertingV2EpisodeDetailsOverviewListGroupingError')
    ).toBeInTheDocument();
    // The section as a whole does not error out.
    expect(
      screen.queryByTestId('alertingV2EpisodeOverviewListSectionError')
    ).not.toBeInTheDocument();
  });

  it('renders the error state when group actions fail to load', async () => {
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
    fetchEpisodeActionsMock.mockResolvedValue([]);
    fetchGroupActionsMock.mockRejectedValue(new Error('boom'));

    render(
      <I18nProvider>
        <AlertEpisodeOverviewListSection
          episodeId="ep-1"
          groupHash="gh-1"
          services={mockServices}
        />
      </I18nProvider>,
      { wrapper }
    );

    await waitFor(() =>
      expect(screen.getByTestId('alertingV2EpisodeOverviewListSectionError')).toBeInTheDocument()
    );
  });
});
