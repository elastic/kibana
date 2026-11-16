/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { IngestRateChartContent } from './ingest_rate_chart';

const mockGetStreamHistogram = jest.fn();

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    core: { uiSettings: { get: () => 'Browser' } },
    isServerless: false,
    dependencies: {
      start: {
        data: { search: { search: jest.fn() } },
        streams: { streamsRepositoryClient: { fetch: jest.fn() } },
      },
    },
  }),
}));

jest.mock('../../hooks/use_stream_detail', () => ({ useStreamDetail: jest.fn() }));

jest.mock('../../hooks/use_timefilter', () => ({
  useTimefilter: () => ({
    timeState: {
      start: Date.parse('2026-11-04T00:00:00.000Z'),
      end: Date.parse('2026-11-04T01:00:00.000Z'),
    },
  }),
}));

jest.mock('../../hooks/use_time_range_update', () => ({
  useTimeRangeUpdate: () => ({ updateTimeRange: jest.fn() }),
}));

jest.mock('../../hooks/use_streams_doc_counts_fetch', () => ({
  STREAMS_HISTOGRAM_NUM_DATA_POINTS: 25,
  useStreamDocCountsFetch: () => ({ getStreamHistogram: mockGetStreamHistogram }),
}));

jest.mock('../../hooks/use_streams_app_fetch', () => ({
  useStreamsAppFetch: () => ({
    value: undefined,
    loading: false,
    error: undefined,
    refresh: jest.fn(),
  }),
}));

jest.mock('../../hooks/use_execute_esql_query', () => ({ executeEsqlQuery: jest.fn() }));

jest.mock('@kbn/charts-theme', () => ({ useElasticChartsTheme: () => ({}) }));

jest.mock('./overview_time_filter', () => ({ OverviewTimeFilter: () => null }));

jest.mock('@elastic/charts', () => ({
  ...jest.requireActual('@elastic/charts'),
  Chart: () => <div data-test-subj="mockIngestRateChart" />,
}));

const totals = { docs: 42, storageBytes: 1024, loading: false };

/** One promise per test: the component treats a new promise as a new fetch. */
const histogramReturns = (result: Promise<unknown>) => {
  result.catch(() => {});
  mockGetStreamHistogram.mockReturnValue(result);
};

const renderChart = () =>
  render(
    <I18nProvider>
      <IngestRateChartContent
        streamName="accounting-2026"
        esqlSource="FROM accounting-2026"
        canReadFailureStore={false}
        isQueryStream={false}
        isDraft={false}
        totals={totals}
      />
    </I18nProvider>
  );

describe('IngestRateChartContent', () => {
  beforeEach(() => {
    mockGetStreamHistogram.mockReset();
  });

  it('shows a message instead of an empty chart when the histogram fails', async () => {
    histogramReturns(Promise.reject(new Error('Unknown column [@timestamp]')));
    renderChart();

    expect(await screen.findByTestId('streamsAppIngestRateChartError')).toHaveTextContent(
      '@timestamp'
    );
    expect(screen.queryByTestId('mockIngestRateChart')).not.toBeInTheDocument();
  });

  it('leaves out the @timestamp hint when the histogram fails for another reason', async () => {
    histogramReturns(Promise.reject(new Error('Request failed with status 500')));
    renderChart();

    const message = await screen.findByTestId('streamsAppIngestRateChartError');
    expect(message).toHaveTextContent("Couldn't load the ingest rate.");
    expect(message).not.toHaveTextContent('@timestamp');
  });

  it('keeps loading instead of showing the message when the request was cancelled', async () => {
    const abortError = new Error('The user aborted a request.');
    abortError.name = 'AbortError';
    histogramReturns(Promise.reject(abortError));
    renderChart();

    await waitFor(() => expect(mockGetStreamHistogram).toHaveBeenCalled());
    await act(async () => {});
    expect(screen.queryByTestId('streamsAppIngestRateChartError')).not.toBeInTheDocument();
    expect(screen.getByTestId('streamsAppIngestStatDocsInRange')).not.toHaveTextContent('-');
  });

  it('shows the derived statistics as unavailable while the total still shows', async () => {
    histogramReturns(Promise.reject(new Error('Unknown column [@timestamp]')));
    renderChart();
    await screen.findByTestId('streamsAppIngestRateChartError');

    expect(screen.getByTestId('streamsAppIngestStatDocsTotal')).toHaveTextContent('42');
    expect(screen.getByTestId('streamsAppIngestStatDocsInRange')).toHaveTextContent('-');
    expect(screen.getByTestId('streamsAppIngestStatPeakIngestRate')).toHaveTextContent('-');
    expect(screen.queryByText('avg. 0/day')).not.toBeInTheDocument();
  });

  it('renders the chart when the histogram resolves', async () => {
    histogramReturns(
      Promise.resolve({
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: 'doc_count', type: 'long' },
        ],
        values: [],
      })
    );
    renderChart();

    expect(await screen.findByTestId('mockIngestRateChart')).toBeInTheDocument();
    expect(screen.queryByTestId('streamsAppIngestRateChartError')).not.toBeInTheDocument();
    expect(screen.getByTestId('streamsAppIngestStatDocsInRange')).toHaveTextContent('0');
  });
});
