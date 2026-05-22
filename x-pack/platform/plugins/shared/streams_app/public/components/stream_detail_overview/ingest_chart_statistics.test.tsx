/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { IngestChartStatistics } from './ingest_chart_statistics';

// ─── Module mocks ────────────────────────────────────────────────────────────

const mockUseStreamsAppFetch = jest.fn();

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    core: { uiSettings: {} },
    isServerless: false,
    dependencies: {
      start: {
        data: { search: { search: jest.fn() } },
        streams: { streamsRepositoryClient: { fetch: jest.fn() } },
      },
    },
  }),
}));

jest.mock('../../hooks/use_streams_app_fetch', () => ({
  useStreamsAppFetch: (...args: unknown[]) => mockUseStreamsAppFetch(...args),
}));

// executeEsqlQuery is called inside useStreamsAppFetch which we mock entirely,
// so this import only needs to exist to prevent module-not-found errors.
jest.mock('../../hooks/use_execute_esql_query', () => ({
  executeEsqlQuery: jest.fn(),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const renderWithI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

const defaultFetch = (value: unknown) => ({
  value,
  loading: false,
  error: undefined,
  refresh: jest.fn(),
});

const loadingFetch = { value: undefined, loading: true, error: undefined, refresh: jest.fn() };

/**
 * Sets up the three sequential `useStreamsAppFetch` calls:
 *   1. totalDocsFetch
 *   2. previousPeriodFetch
 *   3. storeStatsFetch
 */
function setupFetches({
  totalDocs = [{ stream: 'logs', count: 10_000 }],
  previousDocCount = 8_000,
  storeSizeBytes = 14_400_000_000, // ~14.2 GB in binary
  totalDocsLoading = false,
  previousPeriodLoading = false,
  storeStatsLoading = false,
}: {
  totalDocs?: Array<{ stream: string; count: number }>;
  previousDocCount?: number | null;
  storeSizeBytes?: number;
  totalDocsLoading?: boolean;
  previousPeriodLoading?: boolean;
  storeStatsLoading?: boolean;
} = {}) {
  const previousPeriodValue =
    previousDocCount !== null
      ? { values: [[previousDocCount]], columns: [{ name: 'doc_count', type: 'long' }] }
      : undefined;

  mockUseStreamsAppFetch
    .mockReturnValueOnce(totalDocsLoading ? loadingFetch : defaultFetch(totalDocs))
    .mockReturnValueOnce(previousPeriodLoading ? loadingFetch : defaultFetch(previousPeriodValue))
    .mockReturnValueOnce(
      storeStatsLoading ? loadingFetch : defaultFetch({ store_size_bytes: storeSizeBytes })
    );
}

const baseTimeseries = [
  {
    id: '-',
    data: [
      { x: 0, doc_count: 100 },
      { x: ONE_HOUR_MS, doc_count: 200 },
      { x: 2 * ONE_HOUR_MS, doc_count: 150 },
    ],
  },
];

const baseProps = {
  allTimeseries: baseTimeseries,
  intervalMs: ONE_HOUR_MS,
  timeStart: 0,
  timeEnd: ONE_DAY_MS,
  esqlSource: 'logs',
  streamName: 'logs',
  isQueryStream: false,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('IngestChartStatistics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('stat labels', () => {
    it('renders all four stat labels for an ingest stream', () => {
      setupFetches();
      renderWithI18n(<IngestChartStatistics {...baseProps} />);

      expect(screen.getByText('Docs total')).toBeInTheDocument();
      expect(screen.getByText('Docs in time range')).toBeInTheDocument();
      expect(screen.getByText('Peak ingest rate')).toBeInTheDocument();
      expect(screen.getByText('Storage size')).toBeInTheDocument();
    });

    it('does not render the storage size stat for a query stream', () => {
      setupFetches();
      renderWithI18n(<IngestChartStatistics {...baseProps} isQueryStream />);

      expect(screen.queryByText('Storage size')).not.toBeInTheDocument();
    });
  });

  describe('docs in time range', () => {
    it('sums all bucket doc_counts from allTimeseries', () => {
      setupFetches();
      renderWithI18n(<IngestChartStatistics {...baseProps} />);

      // 100 + 200 + 150 = 450
      expect(screen.getByText('450')).toBeInTheDocument();
      expect(screen.getByText('docs')).toBeInTheDocument();
    });

    it('handles null doc_count values by treating them as 0', () => {
      setupFetches();
      renderWithI18n(
        <IngestChartStatistics
          {...baseProps}
          allTimeseries={[
            {
              id: '-',
              data: [
                { x: 0, doc_count: null },
                { x: 1, doc_count: 300 },
              ],
            },
          ]}
        />
      );

      expect(screen.getByText('300')).toBeInTheDocument();
    });
  });

  describe('docs total', () => {
    it('displays the total doc count from the API', () => {
      setupFetches({ totalDocs: [{ stream: 'logs', count: 667_123 }] });
      renderWithI18n(<IngestChartStatistics {...baseProps} />);

      expect(screen.getByText('667,123')).toBeInTheDocument();
      expect(screen.getByText('total docs')).toBeInTheDocument();
    });

    it('shows a loading spinner while the total docs fetch is in flight', () => {
      setupFetches({ totalDocsLoading: true });
      const { container } = renderWithI18n(<IngestChartStatistics {...baseProps} />);

      // EuiLoadingSpinner renders an element with the loading role
      expect(container.querySelector('.euiLoadingSpinner')).toBeInTheDocument();
    });
  });

  describe('peak ingest rate', () => {
    it('computes peak rate as max bucket count divided by interval in seconds', () => {
      // peak bucket = 200 docs, intervalMs = ONE_HOUR_MS = 3600s
      // peakRateDocsSec = 200 / 3600 ≈ 0.0556 → formatted as "0.05"
      // (numeral floors at the .666 boundary due to IEEE 754 representation)
      setupFetches();
      renderWithI18n(<IngestChartStatistics {...baseProps} />);

      expect(screen.getByText('0.05')).toBeInTheDocument();
      expect(screen.getByText('docs/sec')).toBeInTheDocument();
    });

    it('shows two decimal places for sub-1 rates to avoid displaying "0"', () => {
      // With a very low rate the old '0,0' format would round to "0"
      setupFetches();
      renderWithI18n(
        <IngestChartStatistics
          {...baseProps}
          allTimeseries={[{ id: '-', data: [{ x: 0, doc_count: 1 }] }]}
          intervalMs={ONE_HOUR_MS}
        />
      );

      // 1 / 3600 ≈ 0.000278 → "0.00"
      expect(screen.getByText('0.00')).toBeInTheDocument();
    });

    it('shows one optional decimal for rates between 1 and 100', () => {
      // peak = 1000 docs over 60s → 16.7 docs/sec
      setupFetches();
      renderWithI18n(
        <IngestChartStatistics
          {...baseProps}
          allTimeseries={[{ id: '-', data: [{ x: 0, doc_count: 1_000 }] }]}
          intervalMs={60_000}
        />
      );

      // 1000/60 = 16.666... → "16.6" (numeral floors at the .666 boundary)
      expect(screen.getByText('16.6')).toBeInTheDocument();
    });

    it('shows integer format for rates >= 100', () => {
      // peak = 100000 docs over 60s → 1,666 docs/sec
      // (100000/60 = 1666.666... floors to 1666 due to numeral's IEEE 754 rounding)
      setupFetches();
      renderWithI18n(
        <IngestChartStatistics
          {...baseProps}
          allTimeseries={[{ id: '-', data: [{ x: 0, doc_count: 100_000 }] }]}
          intervalMs={60_000}
        />
      );

      expect(screen.getByText('1,666')).toBeInTheDocument();
    });

    it('shows average docs/day in the subtitle', () => {
      // total = 450, timeRange = 1 day → avg = 450/day
      setupFetches();
      renderWithI18n(<IngestChartStatistics {...baseProps} />);

      expect(screen.getByText('avg. 450/day')).toBeInTheDocument();
    });
  });

  describe('trend subtitle (docs in time range)', () => {
    it('shows a positive trend when current period is higher than last week', () => {
      // current = 450, previous = 400 → +12.5% → "+13%"
      setupFetches({ previousDocCount: 400 });
      renderWithI18n(<IngestChartStatistics {...baseProps} />);

      expect(screen.getByText(/↑\+13% vs\. last week/)).toBeInTheDocument();
    });

    it('shows a negative trend when current period is lower than last week', () => {
      // current = 450, previous = 600 → -25%
      // The ↓ arrow conveys direction; no minus sign is added (sign: '' for negative trends).
      setupFetches({ previousDocCount: 600 });
      renderWithI18n(<IngestChartStatistics {...baseProps} />);

      expect(screen.getByText(/↓25% vs\. last week/)).toBeInTheDocument();
    });

    it('shows "no trends available yet" when previous period has no data', () => {
      setupFetches({ previousDocCount: null });
      renderWithI18n(<IngestChartStatistics {...baseProps} />);

      expect(screen.getAllByText('no trends available yet').length).toBeGreaterThan(0);
    });

    it('shows "no trends available yet" when previous doc count is zero', () => {
      // Previous = 0 means trend is undefined (divide by zero)
      setupFetches({ previousDocCount: 0 });
      renderWithI18n(<IngestChartStatistics {...baseProps} />);

      expect(screen.getAllByText('no trends available yet').length).toBeGreaterThan(0);
    });

    it('shows a loading spinner while the previous period fetch is in flight', () => {
      setupFetches({ previousPeriodLoading: true });
      const { container } = renderWithI18n(<IngestChartStatistics {...baseProps} />);

      expect(container.querySelector('.euiLoadingSpinner')).toBeInTheDocument();
    });
  });

  describe('storage size', () => {
    it('displays the numeric value and unit separately', () => {
      // 1 GB = 1,073,741,824 bytes → formatBytes → "1.1 GB" approx
      setupFetches({ storeSizeBytes: 1_073_741_824 });
      renderWithI18n(<IngestChartStatistics {...baseProps} />);

      // The value and unit are in separate DOM elements
      expect(screen.getByText('GB')).toBeInTheDocument();
    });

    it('shows "no trends available yet" for storage (no trend computation)', () => {
      setupFetches();
      renderWithI18n(<IngestChartStatistics {...baseProps} />);

      // Storage always has trend=null, so it always shows this message
      expect(screen.getAllByText('no trends available yet').length).toBeGreaterThan(0);
    });

    it('shows a loading spinner while store stats are loading', () => {
      setupFetches({ storeStatsLoading: true });
      const { container } = renderWithI18n(<IngestChartStatistics {...baseProps} />);

      expect(container.querySelector('.euiLoadingSpinner')).toBeInTheDocument();
    });
  });
});
