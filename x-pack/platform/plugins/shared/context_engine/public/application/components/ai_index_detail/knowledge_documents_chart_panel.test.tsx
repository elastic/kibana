/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { KiHistogramBucket } from '../../../../common/http_api/knowledge_indicators';
import { KnowledgeDocumentsChartPanel } from './knowledge_documents_chart_panel';

const mockBarSeriesProps = jest.fn();
const mockAxisProps = jest.fn();
const mockTooltipProps = jest.fn();

jest.mock('@elastic/charts', () => {
  const actual = jest.requireActual('@elastic/charts');
  return {
    ...actual,
    Chart: ({ children }: { children: React.ReactNode }) => (
      <div data-test-subj="mockChart">{children}</div>
    ),
    Settings: () => null,
    Axis: (props: Record<string, unknown>) => {
      mockAxisProps(props);
      return null;
    },
    Tooltip: (props: Record<string, unknown>) => {
      mockTooltipProps(props);
      return null;
    },
    BarSeries: (props: Record<string, unknown>) => {
      mockBarSeriesProps(props);
      return null;
    },
  };
});

jest.mock('../../hooks/use_ki_histogram');

const { useKiHistogram: mockUseKiHistogram } = jest.requireMock('../../hooks/use_ki_histogram');

const buckets: KiHistogramBucket[] = [
  { date: '2026-11-19', count: 0 },
  { date: '2026-11-20', count: 4 },
];

const histogramResult = (
  overrides: { buckets?: KiHistogramBucket[]; isLoading?: boolean; error?: Error } = {}
) => ({ buckets, isLoading: false, error: undefined, ...overrides });

const renderPanel = () =>
  render(
    <I18nProvider>
      <EuiProvider>
        <KnowledgeDocumentsChartPanel aiIndexId="my-index" />
      </EuiProvider>
    </I18nProvider>
  );

describe('KnowledgeDocumentsChartPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKiHistogram.mockReturnValue(histogramResult());
  });

  it('draws one ordinal bar per day from the histogram of the AI index', () => {
    renderPanel();

    expect(mockUseKiHistogram).toHaveBeenCalledWith('my-index');
    expect(screen.getByText('Knowledge documents over time')).toBeInTheDocument();
    expect(mockBarSeriesProps).toHaveBeenCalledWith(
      expect.objectContaining({
        xScaleType: 'ordinal',
        xAccessor: 'date',
        yAccessors: ['count'],
        data: buckets,
      })
    );
    expect(screen.queryByTestId('contextOverviewDocumentsChartEmpty')).not.toBeInTheDocument();
    const countAxis = mockAxisProps.mock.calls.find(([props]) => props.id === 'count')?.[0];
    expect(countAxis.domain).toBeUndefined();
    expect(countAxis.maximumFractionDigits).toBe(0);
  });

  it('labels days as UTC dates on the axis and in the tooltip', () => {
    renderPanel();

    const dateAxis = mockAxisProps.mock.calls.find(([props]) => props.id === 'date')?.[0];
    expect(dateAxis.tickFormat('2026-11-20')).toBe('Nov 20');
    const [[tooltip]] = mockTooltipProps.mock.calls;
    expect(tooltip.headerFormatter({ value: '2026-11-01' })).toBe('Nov 1');
  });

  it('shows empty bars and a short text when no documents were added in 30 days', () => {
    mockUseKiHistogram.mockReturnValue(
      histogramResult({ buckets: [{ date: '2026-11-20', count: 0 }] })
    );

    renderPanel();

    expect(screen.getByTestId('mockChart')).toBeInTheDocument();
    const countAxis = mockAxisProps.mock.calls.find(([props]) => props.id === 'count')?.[0];
    expect(countAxis.domain).toEqual({ min: 0, max: 1 });
    expect(countAxis.ticks).toBe(1);
    expect(screen.getByTestId('contextOverviewDocumentsChartEmpty')).toHaveTextContent(
      'No new knowledge documents in the last 30 days.'
    );
  });

  it('shows a skeleton while loading', () => {
    mockUseKiHistogram.mockReturnValue(histogramResult({ buckets: [], isLoading: true }));

    renderPanel();

    expect(screen.getByTestId('contextOverviewDocumentsChartLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('mockChart')).not.toBeInTheDocument();
  });

  it('shows an error text when the histogram fails to load', () => {
    mockUseKiHistogram.mockReturnValue(histogramResult({ buckets: [], error: new Error('boom') }));

    renderPanel();

    expect(screen.getByTestId('contextOverviewDocumentsChartError')).toHaveTextContent(
      'Unable to load the knowledge documents chart.'
    );
    expect(screen.queryByTestId('mockChart')).not.toBeInTheDocument();
  });
});
