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
import type { UnifiedDocViewerStart } from '@kbn/unified-doc-viewer-plugin/public';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { runEsqlAsyncSearch } from '../../utils/run_esql_async_search';
import { useAlertingEpisodeSourceDataView } from '../../hooks/use_alerting_episode_source_data_view';
import {
  createMockServices,
  createQueryClientWrapper,
  createTestQueryClient,
} from '../../hooks/test_utils';
import { AlertEpisodeMetadataSection } from './metadata_section';

jest.mock('../../utils/run_esql_async_search');
jest.mock('../../hooks/use_alerting_episode_source_data_view');

jest.mock('@kbn/discover-utils', () => ({
  buildDataTableRecord: jest.fn((doc) => ({ id: 'mock-id', raw: doc, flattened: {} })),
}));

const runEsqlAsyncSearchMock = jest.mocked(runEsqlAsyncSearch);
const useAlertingEpisodeSourceDataViewMock = jest.mocked(useAlertingEpisodeSourceDataView);

const mockTableRender = jest.fn(() => <div data-test-subj="mock-doc-viewer-table" />);

const mockUnifiedDocViewer = {
  registry: {
    getAll: () => [{ id: 'doc_view_table', render: mockTableRender }],
  },
} as unknown as UnifiedDocViewerStart;

const mockHttp = httpServiceMock.createStartContract();
const mockServices = createMockServices({
  http: mockHttp,
  unifiedDocViewer: mockUnifiedDocViewer,
});

const mockRule = {
  id: 'rule-1',
  metadata: { name: 'My rule' },
  query: { format: 'standalone', breach: { query: 'FROM logs' } },
} as unknown as RuleResponse;

// Episode events ESQL query response template (used by useFetchEpisodeEventsQuery)
const mockEpisodeEventsResponse = {
  columns: [
    { name: '@timestamp', type: 'date' },
    { name: 'episode.status', type: 'keyword' },
    { name: 'rule.id', type: 'keyword' },
    { name: 'group_hash', type: 'keyword' },
  ],
  values: [['2024-01-01T00:00:00.000Z', ALERT_EPISODE_STATUS.ACTIVE, 'rule-1', 'gh-1']],
};

// Episode event-data ESQL query response template (used by useFetchEpisodeEventDataQuery)
const buildEventDataResponse = (lastData: string | null) => ({
  columns: [
    { name: 'last_data', type: 'keyword' },
    { name: 'last_data_timestamp', type: 'date' },
    { name: 'last_event_timestamp', type: 'date' },
  ],
  values: [
    [
      lastData,
      lastData ? '2026-04-29T10:00:00.000Z' : null,
      lastData ? '2026-04-29T10:00:00.000Z' : null,
    ],
  ],
});

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

describe('AlertEpisodeMetadataSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    useAlertingEpisodeSourceDataViewMock.mockReturnValue({
      value: { id: 'mock-data-view' },
      loading: false,
    } as never);
  });

  it('renders a loading spinner while events / data view are loading', () => {
    runEsqlAsyncSearchMock.mockImplementation(() => new Promise(() => {}));
    useAlertingEpisodeSourceDataViewMock.mockReturnValue({
      value: undefined,
      loading: true,
    } as never);

    render(
      <I18nProvider>
        <AlertEpisodeMetadataSection episodeId="ep-1" services={mockServices} />
      </I18nProvider>,
      { wrapper }
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders an error message when event data fails to load', async () => {
    // Episode events succeed, rule fetch succeeds, but event data fails.
    runEsqlAsyncSearchMock
      .mockResolvedValueOnce(mockEpisodeEventsResponse)
      .mockRejectedValueOnce(new Error('boom'));
    mockHttp.get.mockResolvedValueOnce(mockRule);

    render(
      <I18nProvider>
        <AlertEpisodeMetadataSection episodeId="ep-1" services={mockServices} />
      </I18nProvider>,
      { wrapper }
    );

    await waitFor(() => expect(screen.getByText('Failed to load metadata.')).toBeInTheDocument());
  });

  it('renders the empty state when no event data is available', async () => {
    runEsqlAsyncSearchMock
      .mockResolvedValueOnce(mockEpisodeEventsResponse)
      .mockResolvedValueOnce(buildEventDataResponse(null));
    mockHttp.get.mockResolvedValueOnce(mockRule);

    render(
      <I18nProvider>
        <AlertEpisodeMetadataSection episodeId="ep-1" services={mockServices} />
      </I18nProvider>,
      { wrapper }
    );

    await waitFor(() =>
      expect(screen.getByTestId('alertingV2EpisodeMetadataTabEmpty')).toBeInTheDocument()
    );
    expect(
      screen.getByText('No evaluation data is available for this episode.')
    ).toBeInTheDocument();
  });

  it('renders the metadata table with the doc-viewer registry render function', async () => {
    runEsqlAsyncSearchMock
      .mockResolvedValueOnce(mockEpisodeEventsResponse)
      .mockResolvedValueOnce(buildEventDataResponse(JSON.stringify({ threshold_met: true })));
    mockHttp.get.mockResolvedValueOnce(mockRule);

    render(
      <I18nProvider>
        <AlertEpisodeMetadataSection episodeId="ep-1" services={mockServices} />
      </I18nProvider>,
      { wrapper }
    );

    await waitFor(() => expect(screen.getByTestId('mock-doc-viewer-table')).toBeInTheDocument());

    expect(mockTableRender).toHaveBeenCalledWith(
      expect.objectContaining({
        hit: expect.objectContaining({
          id: 'mock-id',
          raw: { _source: { threshold_met: true } },
        }),
        dataView: expect.objectContaining({ id: 'mock-data-view' }),
      })
    );
  });
});
