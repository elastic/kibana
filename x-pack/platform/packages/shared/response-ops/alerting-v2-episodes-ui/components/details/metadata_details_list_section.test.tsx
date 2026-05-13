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
import { fetchEpisodeActions } from '../../apis/fetch_episode_actions';
import { createQueryClientWrapper, createTestQueryClient } from '../../hooks/test_utils';
import { AlertEpisodeMetadataDetailsListSection } from './metadata_details_list_section';
import type { AlertEpisodeDetailsServices } from './types';

jest.mock('../../utils/run_esql_async_search');
jest.mock('../../apis/fetch_episode_actions');

const runEsqlAsyncSearchMock = jest.mocked(runEsqlAsyncSearch);
const fetchEpisodeActionsMock = jest.mocked(fetchEpisodeActions);

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
  metadata: { name: 'My rule' },
  grouping: { fields: ['service.name', 'host.name'] },
} as unknown as RuleResponse;

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

describe('AlertEpisodeMetadataDetailsListSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('renders the metadata list with grouping fields once data is loaded', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue({
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: 'episode.status', type: 'keyword' },
        { name: 'rule.id', type: 'keyword' },
        { name: 'group_hash', type: 'keyword' },
      ],
      values: [['2024-01-01T00:00:00.000Z', ALERT_EPISODE_STATUS.ACTIVE, 'rule-1', 'gh-1']],
    });
    fetchEpisodeActionsMock.mockResolvedValue([]);
    mockHttp.get.mockResolvedValueOnce(mockRule);

    render(
      <I18nProvider>
        <AlertEpisodeMetadataDetailsListSection episodeId="ep-1" services={mockServices} />
      </I18nProvider>,
      { wrapper }
    );

    await waitFor(() =>
      expect(screen.getByTestId('alertingV2EpisodeDetailsMetadataList')).toBeInTheDocument()
    );
  });

  it('renders the loading state while events are loading', () => {
    runEsqlAsyncSearchMock.mockImplementation(() => new Promise(() => {}));
    fetchEpisodeActionsMock.mockImplementation(() => new Promise(() => {}));

    render(
      <I18nProvider>
        <AlertEpisodeMetadataDetailsListSection episodeId="ep-1" services={mockServices} />
      </I18nProvider>,
      { wrapper }
    );

    expect(
      screen.getByTestId('alertingV2EpisodeMetadataDetailsListSectionLoading')
    ).toBeInTheDocument();
  });

  it('renders the error state when events fail to load', async () => {
    runEsqlAsyncSearchMock.mockRejectedValue(new Error('boom'));
    fetchEpisodeActionsMock.mockResolvedValue([]);

    render(
      <I18nProvider>
        <AlertEpisodeMetadataDetailsListSection episodeId="ep-1" services={mockServices} />
      </I18nProvider>,
      { wrapper }
    );

    await waitFor(() =>
      expect(
        screen.getByTestId('alertingV2EpisodeMetadataDetailsListSectionError')
      ).toBeInTheDocument()
    );
  });
});
