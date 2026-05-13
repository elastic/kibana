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
import { createFormWrapper, createMockServices } from '../../test_utils';

jest.mock('../hooks/use_preview_chart');

const mockUsePreviewChart = jest.mocked(usePreviewChartModule.usePreviewChart);

const mockLensAttributes = {
  visualizationType: 'lnsXY',
  title: '',
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
  isLoading: false,
  hasError: false,
};

describe('PreviewChart', () => {
  let services: ReturnType<typeof createMockServices>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePreviewChart.mockReturnValue(defaultChartResult);
    services = createMockServices();
  });

  const renderChart = (props = defaultProps) => {
    const Wrapper = createFormWrapper(
      {
        timeField: '@timestamp',
        schedule: { every: '5m', lookback: '5m' },
        evaluation: { query: { base: 'FROM logs-*' } },
      },
      services
    );
    return render(
      <Wrapper>
        <PreviewChart {...props} />
      </Wrapper>
    );
  };

  it('renders nothing when no lens attributes or time range is available', () => {
    const { container } = renderChart();

    expect(container.querySelector('[data-test-subj="rulePreviewChart"]')).not.toBeInTheDocument();
    expect(
      container.querySelector('[data-test-subj="rulePreviewChartLoading"]')
    ).not.toBeInTheDocument();
  });

  it('renders the loading spinner when isLoading is true and no attributes exist', () => {
    mockUsePreviewChart.mockReturnValue({
      ...defaultChartResult,
      isLoading: true,
    });

    renderChart();

    expect(screen.getByTestId('rulePreviewChartLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('rulePreviewChart')).not.toBeInTheDocument();
  });

  it('renders the Lens chart when lensAttributes and timeRange are available', () => {
    mockUsePreviewChart.mockReturnValue({
      ...defaultChartResult,
      lensAttributes: mockLensAttributes as any,
      timeRange: { from: '2024-01-01T00:00:00Z', to: '2024-01-01T00:05:00Z' },
    });

    renderChart();

    expect(screen.getByTestId('rulePreviewChart')).toBeInTheDocument();
  });

  it('renders the error callout when hasError is true', () => {
    mockUsePreviewChart.mockReturnValue({
      ...defaultChartResult,
      hasError: true,
    });

    renderChart();

    expect(screen.getByText('Unable to load chart preview')).toBeInTheDocument();
    expect(screen.queryByTestId('rulePreviewChart')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rulePreviewChartLoading')).not.toBeInTheDocument();
  });

  it('renders the chart (not loading spinner) when attributes exist and isLoading is true', () => {
    mockUsePreviewChart.mockReturnValue({
      ...defaultChartResult,
      lensAttributes: mockLensAttributes as any,
      timeRange: { from: '2024-01-01T00:00:00Z', to: '2024-01-01T00:05:00Z' },
      isLoading: true,
    });

    renderChart();

    expect(screen.getByTestId('rulePreviewChart')).toBeInTheDocument();
    expect(screen.queryByTestId('rulePreviewChartLoading')).not.toBeInTheDocument();
  });

  it('passes props to usePreviewChart', () => {
    renderChart({
      query: 'FROM logs-* | WHERE status >= 500',
      timeField: 'event.created',
      lookback: '1h',
    });

    expect(mockUsePreviewChart).toHaveBeenCalledWith({
      query: 'FROM logs-* | WHERE status >= 500',
      timeField: 'event.created',
      lookback: '1h',
      esqlColumns: undefined,
    });
  });

  it('passes esqlColumns to usePreviewChart', () => {
    const esqlColumns = [
      { id: 'host.name', displayAsText: 'host.name', esType: 'keyword' },
      { id: 'count', displayAsText: 'count', esType: 'long' },
    ];

    renderChart({ ...defaultProps, esqlColumns } as any);

    expect(mockUsePreviewChart).toHaveBeenCalledWith(
      expect.objectContaining({
        esqlColumns,
      })
    );
  });
});
