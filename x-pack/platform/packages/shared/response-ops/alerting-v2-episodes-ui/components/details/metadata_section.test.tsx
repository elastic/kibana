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
import { buildDataTableRecord } from '@kbn/discover-utils';
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
const buildDataTableRecordMock = jest.mocked(buildDataTableRecord);
const useAlertingEpisodeSourceDataViewMock = jest.mocked(useAlertingEpisodeSourceDataView);

const mockTableRender = jest.fn(
  (_props: {
    dataView: {
      getFieldByName: (name: string) => { type: string } | undefined;
    };
  }) => <div data-test-subj="mock-doc-viewer-table" />
);

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
  query: { base: 'FROM logs' },
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

// Latest event data response (used by useFetchEpisodeEventDataQuery and useFetchEpisodeQuery)
const buildEventDataResponse = (lastData: string | null) => ({
  columns: [
    { name: '@timestamp', type: 'date' },
    { name: 'episode_data', type: 'keyword' },
  ],
  values: lastData ? [['2026-04-29T10:00:00.000Z', lastData]] : [],
});

// The section fires its ESQL queries concurrently, so the mock dispatches on
// the query text instead of relying on call order.
const mockEsqlResponses = (eventData: string | null | 'error') => {
  runEsqlAsyncSearchMock.mockImplementation(async ({ params }) => {
    const query = String(params.query ?? '');
    if (query.includes('JSON_EXTRACT')) {
      if (eventData === 'error') {
        throw new Error('boom');
      }
      return buildEventDataResponse(eventData);
    }
    return mockEpisodeEventsResponse;
  });
};

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

const sourceDataView = {
  id: 'mock-data-view',
  toSpec: () => ({
    id: 'mock-data-view',
    title: 'logs-*',
    fields: {
      'host.name': {
        name: 'host.name',
        type: 'string',
        searchable: true,
        aggregatable: true,
      },
    },
  }),
};

describe('AlertEpisodeMetadataSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    useAlertingEpisodeSourceDataViewMock.mockReturnValue({
      value: sourceDataView,
      loading: false,
    } as never);
  });

  it('renders a skeleton while events / data view are loading', () => {
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

    expect(
      screen
        .getByTestId('alertingV2EpisodeMetadataSectionLoading')
        .querySelector('.euiSkeletonText')
    ).not.toBeNull();
  });

  it('renders an error message when event data fails to load', async () => {
    // Episode events succeed, rule fetch succeeds, but event data fails.
    mockEsqlResponses('error');
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
    mockEsqlResponses(null);
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
    expect(screen.getByText('No evaluation data is available for this alert.')).toBeInTheDocument();
  });

  it('renders the metadata table with the doc-viewer registry render function', async () => {
    mockEsqlResponses(JSON.stringify({ threshold_met: true }));
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
          raw: { _source: { data: { threshold_met: true } } },
        }),
        dataView: expect.objectContaining({
          id: 'mock-data-view-data-container',
        }),
      })
    );
    const passedDataView = mockTableRender.mock.calls.at(-1)?.[0]?.dataView;
    expect(passedDataView?.getFieldByName('host.name')).toBeUndefined();
    expect(passedDataView?.getFieldByName('data.host.name')?.type).toBe('string');
  });

  it('strips _id/_index/_score/_ignored metadata fields from the rendered hit', async () => {
    // Mirrors what flattenHit actually does for a synthetic (non-search) hit: it merges the data
    // view's metaFields into `flattened` even though this hit never had real values for them.
    buildDataTableRecordMock.mockReturnValueOnce({
      id: 'mock-id',
      raw: { _source: { data: { threshold_met: true } } },
      flattened: {
        'data.threshold_met': true,
        _id: undefined,
        _index: undefined,
        _score: undefined,
        _ignored: undefined,
      },
    });

    mockEsqlResponses(JSON.stringify({ threshold_met: true }));
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
          flattened: { 'data.threshold_met': true },
        }),
      })
    );
  });
});
