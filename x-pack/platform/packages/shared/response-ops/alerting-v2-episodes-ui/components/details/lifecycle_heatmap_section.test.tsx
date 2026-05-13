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
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import { runEsqlAsyncSearch } from '../../utils/run_esql_async_search';
import { createQueryClientWrapper, createTestQueryClient } from '../../hooks/test_utils';
import { AlertEpisodeLifecycleHeatmapSection } from './lifecycle_heatmap_section';
import type { AlertEpisodeDetailsServices } from './types';

jest.mock('../../utils/run_esql_async_search');

// Mock the heavy heatmap building block since the section dynamically imports it.
jest.mock('./lifecycle_heatmap', () => ({
  AlertEpisodeLifecycleHeatmap: ({ eventRows }: { eventRows: unknown[] }) => (
    <div data-test-subj="alertingV2EpisodeLifecycleHeatmapMock">{eventRows.length}</div>
  ),
}));

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

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

describe('AlertEpisodeLifecycleHeatmapSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('renders the lifecycle heatmap once events are loaded', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue({
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: 'episode.status', type: 'keyword' },
      ],
      values: [['2024-01-01T00:00:00.000Z', 'active']],
    });

    render(
      <I18nProvider>
        <AlertEpisodeLifecycleHeatmapSection episodeId="ep-1" services={mockServices} />
      </I18nProvider>,
      { wrapper }
    );

    await waitFor(() =>
      expect(screen.getByTestId('alertingV2EpisodeLifecycleHeatmapMock')).toBeInTheDocument()
    );
  });

  it('renders the loading state while events are loading', () => {
    runEsqlAsyncSearchMock.mockImplementation(() => new Promise(() => {}));

    render(
      <I18nProvider>
        <AlertEpisodeLifecycleHeatmapSection episodeId="ep-1" services={mockServices} />
      </I18nProvider>,
      { wrapper }
    );

    expect(
      screen.getByTestId('alertingV2EpisodeLifecycleHeatmapSectionLoading')
    ).toBeInTheDocument();
  });

  it('renders an error state when events fail to load', async () => {
    runEsqlAsyncSearchMock.mockRejectedValue(new Error('boom'));

    render(
      <I18nProvider>
        <AlertEpisodeLifecycleHeatmapSection episodeId="ep-1" services={mockServices} />
      </I18nProvider>,
      { wrapper }
    );

    await waitFor(() =>
      expect(
        screen.getByTestId('alertingV2EpisodeLifecycleHeatmapSectionError')
      ).toBeInTheDocument()
    );
  });
});
