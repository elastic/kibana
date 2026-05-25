/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EpisodesHistogram, type EpisodesHistogramProps } from './episodes_histogram';
import { useUnifiedHistogram } from '@kbn/unified-histogram';
import { useEpisodesHistogramQuery } from '@kbn/alerting-v2-episodes-ui/hooks/use_episodes_histogram_query';
import { useSpaceId } from '@kbn/alerting-v2-episodes-ui/hooks/use_space_id';

jest.mock('@kbn/unified-histogram', () => ({
  useUnifiedHistogram: jest.fn(),
  UnifiedHistogramChart: ({
    renderToggleActions,
  }: {
    renderToggleActions: () => React.ReactNode;
  }) => <div data-test-subj="unifiedHistogramChart">{renderToggleActions?.()}</div>,
  UnifiedBreakdownFieldSelector: ({ breakdown }: { breakdown: { field?: { name: string } } }) => (
    <div
      data-test-subj="unifiedBreakdownFieldSelector"
      data-selected-field={breakdown?.field?.name ?? ''}
    />
  ),
}));

jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_episodes_histogram_query');
jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_space_id');
jest.mock('@kbn/alerting-v2-episodes-ui/queries/episodes_query', () => ({
  buildEpisodesHistogramQuery: jest.fn(() => 'FROM .alerts-*'),
  HISTOGRAM_EPISODE_LIMIT: 10_000,
}));
jest.mock('@kbn/alerting-v2-episodes-ui/utils/histogram_utils', () => ({
  computeBucketInterval: jest.fn(() => '1h'),
}));
jest.mock('@kbn/datemath', () => ({
  __esModule: true,
  default: {
    parse: jest.fn(() => ({ valueOf: () => Date.now() })),
  },
}));

const mockUseUnifiedHistogram = jest.mocked(useUnifiedHistogram);
const mockUseEpisodesHistogramQuery = jest.mocked(useEpisodesHistogramQuery);
const mockUseSpaceId = jest.mocked(useSpaceId);

const mockFetch = jest.fn();
const mockTable = { type: 'datatable' as const, columns: [], rows: [] };

const mockServices = {
  data: {} as any,
  uiActions: {} as any,
  uiSettings: {} as any,
  fieldFormats: {} as any,
  lens: {} as any,
  storage: {} as any,
  expressions: {} as any,
  application: { capabilities: {} as any },
  dataViews: {} as any,
  spaces: {} as any,
} as any;

const mockDataView = {
  fields: [],
} as any;

const defaultProps: EpisodesHistogramProps = {
  services: mockServices,
  dataView: mockDataView,
  filterState: {},
  timeRange: { from: 'now-24h', to: 'now' },
  onTimeRangeChange: jest.fn(),
  onBreakdownFieldChange: jest.fn(),
};

mockUseSpaceId.mockReturnValue('default');
mockUseEpisodesHistogramQuery.mockReturnValue({
  table: mockTable,
  isLoading: false,
  error: undefined,
  isCapHit: false,
  refetch: jest.fn(),
});
mockUseUnifiedHistogram.mockReturnValue({
  isInitialized: true,
  api: { fetch: mockFetch } as any,
  chartProps: {} as any,
  layoutProps: {} as any,
});

afterEach(() => {
  jest.clearAllMocks();
  mockUseEpisodesHistogramQuery.mockReturnValue({
    table: mockTable,
    isLoading: false,
    error: undefined,
    isCapHit: false,
    refetch: jest.fn(),
  });
  mockUseUnifiedHistogram.mockReturnValue({
    isInitialized: true,
    api: { fetch: mockFetch } as any,
    chartProps: {} as any,
    layoutProps: {} as any,
  });
});

describe('EpisodesHistogram', () => {
  it('calls api.fetch with the pre-computed table and its columns', () => {
    render(<EpisodesHistogram {...defaultProps} />);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({ table: mockTable, columns: mockTable.columns })
    );
  });

  it('calls onTimeRangeChange when the brush callback fires', () => {
    let capturedOnBrushEnd: ((data: { range: [number, number] }) => void) | undefined;

    mockUseUnifiedHistogram.mockImplementation(({ onBrushEnd }) => {
      capturedOnBrushEnd = onBrushEnd as typeof capturedOnBrushEnd;
      return {
        isInitialized: true,
        api: { fetch: mockFetch } as any,
        chartProps: {} as any,
        layoutProps: {} as any,
      };
    });

    const mockOnTimeRangeChange = jest.fn();
    render(<EpisodesHistogram {...defaultProps} onTimeRangeChange={mockOnTimeRangeChange} />);

    capturedOnBrushEnd?.({ range: [1704067200000, 1704153600000] });

    expect(mockOnTimeRangeChange).toHaveBeenCalledWith({
      from: new Date(1704067200000).toISOString(),
      to: new Date(1704153600000).toISOString(),
    });
  });

  it('shows the cap warning callout when isCapHit is true', () => {
    mockUseEpisodesHistogramQuery.mockReturnValue({
      table: mockTable,
      isLoading: false,
      error: undefined,
      isCapHit: true,
      refetch: jest.fn(),
    });
    render(<EpisodesHistogram {...defaultProps} />);
    expect(screen.getByText(/Results may be incomplete/)).toBeInTheDocument();
  });

  it('does not show the cap warning when isCapHit is false', () => {
    render(<EpisodesHistogram {...defaultProps} />);
    expect(screen.queryByText(/Results may be incomplete/)).not.toBeInTheDocument();
  });

  it('shows an error callout with a retry button when the query fails', () => {
    mockUseEpisodesHistogramQuery.mockReturnValue({
      table: undefined,
      isLoading: false,
      error: new Error('ES|QL failed'),
      isCapHit: false,
      refetch: jest.fn(),
    });
    render(<EpisodesHistogram {...defaultProps} />);
    expect(screen.getByText(/Failed to load histogram data/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
  });

  it('renders the histogram chart when initialized', () => {
    render(<EpisodesHistogram {...defaultProps} />);
    expect(screen.getByTestId('unifiedHistogramChart')).toBeInTheDocument();
  });

  it('does not render the chart when not yet initialized', () => {
    mockUseUnifiedHistogram.mockReturnValue({
      isInitialized: false,
      api: { fetch: mockFetch } as any,
    } as any);
    render(<EpisodesHistogram {...defaultProps} />);
    expect(screen.queryByTestId('unifiedHistogramChart')).not.toBeInTheDocument();
  });

  it('does not crash and does not call api.fetch when dataView is undefined', () => {
    render(<EpisodesHistogram {...defaultProps} dataView={undefined} />);
    // Chart still renders (isInitialized=true from mock) but fetch must not be called
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('passes isChartLoading=true to useUnifiedHistogram when dataView is undefined', () => {
    render(<EpisodesHistogram {...defaultProps} dataView={undefined} />);
    expect(mockUseUnifiedHistogram).toHaveBeenCalledWith(
      expect.objectContaining({ isChartLoading: true })
    );
  });

  it('renders the breakdown field selector when the chart is initialized', () => {
    render(<EpisodesHistogram {...defaultProps} />);
    expect(screen.getByTestId('unifiedBreakdownFieldSelector')).toBeInTheDocument();
  });

  it('does not render the breakdown field selector when dataView is undefined', () => {
    render(<EpisodesHistogram {...defaultProps} dataView={undefined} />);
    expect(screen.queryByTestId('unifiedBreakdownFieldSelector')).not.toBeInTheDocument();
  });
});
