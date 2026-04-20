/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { AlertSummaryResponse } from '@kbn/alerting-v2-schemas';

jest.mock('@elastic/charts', () => ({
  Chart: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="mock-chart">{children}</div>
  ),
  LineSeries: ({ id }: { id: string }) => <div data-test-subj={`mock-line-series-${id}`} />,
  Settings: () => <div data-test-subj="mock-settings" />,
  Axis: () => null,
  Tooltip: () => null,
  CurveType: { CURVE_MONOTONE_X: 'CURVE_MONOTONE_X' },
  ScaleType: { Time: 'time', Linear: 'linear' },
  Position: { Right: 'right', Bottom: 'bottom', Left: 'left' },
}));

import { AlertsOverTimeChartView } from './alerts_over_time_chart_view';

const buildData = (overrides: Partial<AlertSummaryResponse> = {}): AlertSummaryResponse => ({
  activeEventCount: 4,
  recoveredEventCount: 2,
  activeSeries: [
    { key: 1700000000000, key_as_string: '2023-11-14T00:00:00.000Z', doc_count: 2 },
    { key: 1700003600000, key_as_string: '2023-11-14T01:00:00.000Z', doc_count: 2 },
  ],
  recoveredSeries: [
    { key: 1700000000000, key_as_string: '2023-11-14T00:00:00.000Z', doc_count: 1 },
    { key: 1700003600000, key_as_string: '2023-11-14T01:00:00.000Z', doc_count: 1 },
  ],
  ...overrides,
});

describe('AlertsOverTimeChartView', () => {
  it('renders a loading spinner while loading', () => {
    render(<AlertsOverTimeChartView isLoading />);
    expect(screen.getByTestId('alertsOverTimeChartLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('alertsOverTimeChartContainer')).not.toBeInTheDocument();
  });

  it('renders an error callout when isError is true', () => {
    render(<AlertsOverTimeChartView isError />);
    expect(screen.getByTestId('alertsOverTimeChartError')).toBeInTheDocument();
  });

  it('renders an empty prompt when the response has no events', () => {
    render(
      <AlertsOverTimeChartView
        data={buildData({
          activeEventCount: 0,
          recoveredEventCount: 0,
          activeSeries: [],
          recoveredSeries: [],
        })}
      />
    );
    expect(screen.getByTestId('alertsOverTimeChartEmpty')).toBeInTheDocument();
    expect(screen.queryByTestId('alertsOverTimeChartContainer')).not.toBeInTheDocument();
  });

  it('renders both active and recovered line series when data is present', () => {
    render(<AlertsOverTimeChartView data={buildData()} />);
    expect(screen.getByTestId('alertsOverTimeChartContainer')).toBeInTheDocument();
    expect(screen.getByTestId('mock-line-series-Active')).toBeInTheDocument();
    expect(screen.getByTestId('mock-line-series-Recovered')).toBeInTheDocument();
  });

  it('renders the Discover link when an href is provided', () => {
    render(<AlertsOverTimeChartView data={buildData()} discoverHref="/app/discover#/foo" />);
    const link = screen.getByTestId('alertsOverTimeChartDiscoverLink') as HTMLAnchorElement;
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toBe('/app/discover#/foo');
  });

  it('omits the Discover link when no href is provided', () => {
    render(<AlertsOverTimeChartView data={buildData()} />);
    expect(screen.queryByTestId('alertsOverTimeChartDiscoverLink')).not.toBeInTheDocument();
  });

  it('respects a custom title', () => {
    render(<AlertsOverTimeChartView data={buildData()} title="Custom title" />);
    expect(screen.getByText('Custom title')).toBeInTheDocument();
  });
});
