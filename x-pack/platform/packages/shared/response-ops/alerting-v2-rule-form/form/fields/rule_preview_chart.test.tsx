/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PreviewChart } from './rule_preview_chart';
import * as usePreviewChartModule from '../hooks/use_preview_chart';
import type { UsePreviewChartResult } from '../hooks/use_preview_chart';

jest.mock('../hooks/use_preview_chart');
jest.mock('@kbn/embeddable-plugin/public', () => ({
  EmbeddableRenderer: ({ type, getParentApi, hidePanelChrome }: any) => (
    <div data-test-subj="mockEmbeddableRenderer" data-type={type}>
      Lens Chart Mock
    </div>
  ),
}));

const mockUsePreviewChart = jest.mocked(usePreviewChartModule.usePreviewChart);

const mockLensAttributes = {
  visualizationType: 'lnsXY',
  title: 'Rule results preview',
  state: {
    datasourceStates: { textBased: { layers: {} } },
    filters: [],
    query: { esql: 'FROM logs-*' },
    visualization: { layers: [] },
  },
  references: [],
};

const defaultProps = {
  query: 'FROM logs-*',
  timeField: '@timestamp',
  lookback: '5m',
};

const defaultChartResult: UsePreviewChartResult = {
  lensAttributes: undefined,
  timeRange: undefined,
  chartQuery: null,
  isLoading: false,
  hasError: false,
};

describe('PreviewChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePreviewChart.mockReturnValue(defaultChartResult);
  });

  it('renders nothing when no chart query is available', () => {
    const { container } = render(<PreviewChart {...defaultProps} />);

    expect(container.innerHTML).toBe('');
    expect(screen.queryByTestId('rulePreviewChart')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rulePreviewChartLoading')).not.toBeInTheDocument();
  });

  it('renders the loading spinner when isLoading is true and no attributes exist', () => {
    mockUsePreviewChart.mockReturnValue({
      ...defaultChartResult,
      isLoading: true,
    });

    render(<PreviewChart {...defaultProps} />);

    expect(screen.getByTestId('rulePreviewChartLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('rulePreviewChart')).not.toBeInTheDocument();
  });

  it('renders the Lens chart when lensAttributes are available', () => {
    mockUsePreviewChart.mockReturnValue({
      ...defaultChartResult,
      lensAttributes: mockLensAttributes as any,
      timeRange: { from: '2024-01-01T00:00:00Z', to: '2024-01-01T00:05:00Z' },
      chartQuery:
        'FROM logs-*\n| STATS __count = COUNT(*) BY __bucket = BUCKET(@timestamp, 20, "...", "...")\n| SORT __bucket',
    });

    render(<PreviewChart {...defaultProps} />);

    expect(screen.getByTestId('rulePreviewChart')).toBeInTheDocument();
    expect(screen.getByTestId('mockEmbeddableRenderer')).toBeInTheDocument();
    expect(screen.getByText('Lens Chart Mock')).toBeInTheDocument();
  });

  it('renders the error callout when hasError is true', () => {
    mockUsePreviewChart.mockReturnValue({
      ...defaultChartResult,
      hasError: true,
    });

    render(<PreviewChart {...defaultProps} />);

    expect(screen.getByText('Unable to load chart preview')).toBeInTheDocument();
    expect(screen.queryByTestId('rulePreviewChart')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rulePreviewChartLoading')).not.toBeInTheDocument();
  });

  it('renders the chart (not loading spinner) when attributes exist and isLoading is true', () => {
    mockUsePreviewChart.mockReturnValue({
      ...defaultChartResult,
      lensAttributes: mockLensAttributes as any,
      timeRange: { from: '2024-01-01T00:00:00Z', to: '2024-01-01T00:05:00Z' },
      chartQuery: 'FROM logs-*\n| STATS __count = COUNT(*) ...',
      isLoading: true,
    });

    render(<PreviewChart {...defaultProps} />);

    expect(screen.getByTestId('rulePreviewChart')).toBeInTheDocument();
    expect(screen.queryByTestId('rulePreviewChartLoading')).not.toBeInTheDocument();
  });

  it('passes props to usePreviewChart', () => {
    render(
      <PreviewChart
        query="FROM logs-* | WHERE status >= 500"
        timeField="event.created"
        lookback="1h"
      />
    );

    expect(mockUsePreviewChart).toHaveBeenCalledWith({
      query: 'FROM logs-* | WHERE status >= 500',
      timeField: 'event.created',
      lookback: '1h',
    });
  });

  it('renders the EmbeddableRenderer with type "lens"', () => {
    mockUsePreviewChart.mockReturnValue({
      ...defaultChartResult,
      lensAttributes: mockLensAttributes as any,
      timeRange: { from: '2024-01-01T00:00:00Z', to: '2024-01-01T00:05:00Z' },
      chartQuery: 'FROM logs-*\n| STATS __count = COUNT(*) ...',
    });

    render(<PreviewChart {...defaultProps} />);

    const renderer = screen.getByTestId('mockEmbeddableRenderer');
    expect(renderer).toHaveAttribute('data-type', 'lens');
  });
});
