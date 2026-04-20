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
  LineSeries: () => <div data-test-subj="mock-line-series" />,
  Settings: () => <div data-test-subj="mock-settings" />,
  Axis: () => null,
  Tooltip: () => null,
  CurveType: { CURVE_MONOTONE_X: 'CURVE_MONOTONE_X' },
  ScaleType: { Time: 'time', Linear: 'linear' },
  Position: { Right: 'right', Bottom: 'bottom', Left: 'left' },
}));

import { AlertActivityCardView } from './alert_activity_card_view';

const buildData = (overrides: Partial<AlertSummaryResponse> = {}): AlertSummaryResponse => ({
  activeEventCount: 5,
  recoveredEventCount: 3,
  activeSeries: [
    { key: 1700000000000, key_as_string: '2023-11-14T00:00:00.000Z', doc_count: 2 },
    { key: 1700003600000, key_as_string: '2023-11-14T01:00:00.000Z', doc_count: 3 },
  ],
  recoveredSeries: [
    { key: 1700000000000, key_as_string: '2023-11-14T00:00:00.000Z', doc_count: 1 },
    { key: 1700003600000, key_as_string: '2023-11-14T01:00:00.000Z', doc_count: 2 },
  ],
  ...overrides,
});

describe('AlertActivityCardView', () => {
  it('renders a loading indicator while loading', () => {
    render(<AlertActivityCardView isLoading />);
    expect(screen.getByTestId('alertActivityCardLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('alertActivityCardActive')).not.toBeInTheDocument();
  });

  it('renders an error callout when isError is true', () => {
    render(<AlertActivityCardView isError />);
    expect(screen.getByTestId('alertActivityCardError')).toBeInTheDocument();
    expect(screen.queryByTestId('alertActivityCardActive')).not.toBeInTheDocument();
  });

  it('renders active and recovered counts from the data', () => {
    render(<AlertActivityCardView data={buildData()} />);
    const active = screen.getByTestId('alertActivityCardActive');
    const recovered = screen.getByTestId('alertActivityCardRecovered');
    expect(active.textContent).toContain('5');
    expect(active.textContent).toContain('Active');
    expect(recovered.textContent).toContain('3');
    expect(recovered.textContent).toContain('Recovered');
  });

  it('shows the lookback sub-label when provided', () => {
    render(<AlertActivityCardView data={buildData()} lookbackLabel="Last 30 days" />);
    expect(screen.getByTestId('alertActivityCardLookback')).toHaveTextContent('Last 30 days');
  });

  it('handles zero-count data without crashing', () => {
    render(
      <AlertActivityCardView
        data={buildData({
          activeEventCount: 0,
          recoveredEventCount: 0,
          activeSeries: [],
          recoveredSeries: [],
        })}
      />
    );
    expect(screen.getByTestId('alertActivityCardActive').textContent).toContain('0');
    expect(screen.getByTestId('alertActivityCardRecovered').textContent).toContain('0');
  });
});
