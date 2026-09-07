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

jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_space_id');
jest.mock('@kbn/alerting-v2-episodes-ui/hooks/use_episodes_histogram_query');

const mockUseUnifiedHistogram = jest.mocked(useUnifiedHistogram);
const mockUseEpisodesHistogramQuery = jest.mocked(useEpisodesHistogramQuery);
const mockUseSpaceId = jest.mocked(useSpaceId);

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
  api: { fetch: jest.fn() } as any,
  chartProps: {} as any,
  layoutProps: {} as any,
});

afterEach(() => {
  jest.clearAllMocks();
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
    api: { fetch: jest.fn() } as any,
    chartProps: {} as any,
    layoutProps: {} as any,
  });
});

describe('EpisodesHistogram', () => {
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
      api: { fetch: jest.fn() } as any,
    } as any);
    render(<EpisodesHistogram {...defaultProps} />);
    expect(screen.queryByTestId('unifiedHistogramChart')).not.toBeInTheDocument();
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
