/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { runEsqlAsyncSearch } from '../../utils/run_esql_async_search';
import {
  createMockServices,
  createQueryClientWrapper,
  createTestQueryClient,
} from '../../hooks/test_utils';
import { AlertEpisodeTimelineHeatmapsSection } from './timeline_heatmaps_section';

jest.mock('../../utils/run_esql_async_search');

// Mock the heavy heatmap building blocks since the section dynamically imports them.
jest.mock('./lifecycle_heatmap', () => ({
  AlertEpisodeLifecycleHeatmap: ({ eventRows }: { eventRows: unknown[] }) => (
    <div data-test-subj="alertingV2EpisodeLifecycleHeatmapMock">{eventRows.length}</div>
  ),
}));

jest.mock('./severity_heatmap', () => ({
  AlertEpisodeSeverityHeatmap: ({ eventRows }: { eventRows: unknown[] }) => (
    <div data-test-subj="alertingV2EpisodeSeverityHeatmapMock">{eventRows.length}</div>
  ),
}));

const runEsqlAsyncSearchMock = jest.mocked(runEsqlAsyncSearch);

const mockServices = createMockServices();

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

describe('AlertEpisodeTimelineHeatmapsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('renders both heatmaps inside a single shared panel once events are loaded', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue({
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: 'episode.status', type: 'keyword' },
        { name: 'severity', type: 'keyword' },
      ],
      values: [['2024-01-01T00:00:00.000Z', 'active', 'high']],
    });

    render(
      <I18nProvider>
        <AlertEpisodeTimelineHeatmapsSection episodeId="ep-1" services={mockServices} />
      </I18nProvider>,
      { wrapper }
    );

    await waitFor(() =>
      expect(screen.getByTestId('alertingV2EpisodeTimelineHeatmapsSection')).toBeInTheDocument()
    );

    const panel = screen.getByTestId('alertingV2EpisodeTimelineHeatmapsSection');
    expect(panel).toContainElement(screen.getByTestId('alertingV2EpisodeLifecycleHeatmapMock'));
    expect(panel).toContainElement(screen.getByTestId('alertingV2EpisodeSeverityHeatmapMock'));
  });

  it('renders only the lifecycle heatmap when there are no supported severity events', async () => {
    runEsqlAsyncSearchMock.mockResolvedValue({
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: 'episode.status', type: 'keyword' },
        { name: 'severity', type: 'keyword' },
      ],
      values: [['2024-01-01T00:00:00.000Z', 'active', null]],
    });

    render(
      <I18nProvider>
        <AlertEpisodeTimelineHeatmapsSection episodeId="ep-1" services={mockServices} />
      </I18nProvider>,
      { wrapper }
    );

    await waitFor(() =>
      expect(screen.getByTestId('alertingV2EpisodeLifecycleHeatmapMock')).toBeInTheDocument()
    );
    expect(screen.queryByTestId('alertingV2EpisodeSeverityHeatmapMock')).not.toBeInTheDocument();
  });

  it('renders the loading state while events are loading', () => {
    runEsqlAsyncSearchMock.mockImplementation(() => new Promise(() => {}));

    render(
      <I18nProvider>
        <AlertEpisodeTimelineHeatmapsSection episodeId="ep-1" services={mockServices} />
      </I18nProvider>,
      { wrapper }
    );

    expect(
      screen.getByTestId('alertingV2EpisodeTimelineHeatmapsSectionLoading')
    ).toBeInTheDocument();
  });

  it('renders an error state when events fail to load', async () => {
    runEsqlAsyncSearchMock.mockRejectedValue(new Error('boom'));

    render(
      <I18nProvider>
        <AlertEpisodeTimelineHeatmapsSection episodeId="ep-1" services={mockServices} />
      </I18nProvider>,
      { wrapper }
    );

    await waitFor(() =>
      expect(
        screen.getByTestId('alertingV2EpisodeTimelineHeatmapsSectionError')
      ).toBeInTheDocument()
    );
  });
});
