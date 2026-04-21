/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { UseQueryResult } from '@kbn/react-query';
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

jest.mock('@kbn/core-di-browser', () => ({
  useService: jest.fn(),
  PluginStart: jest.fn((key: string) => `plugin:${key}`),
  CoreStart: jest.fn((key: string) => `core:${key}`),
}));

const mockUseFetchAlertSummary = jest.fn();
jest.mock('../../hooks/use_fetch_alert_summary', () => ({
  useFetchAlertSummary: (params: unknown) => mockUseFetchAlertSummary(params),
}));

import { useService } from '@kbn/core-di-browser';
import { AlertActivityCard } from './alert_activity_card';

const mockUseService = useService as jest.MockedFunction<typeof useService>;

const buildData = (overrides: Partial<AlertSummaryResponse> = {}): AlertSummaryResponse => ({
  activeEventCount: 7,
  recoveredEventCount: 2,
  activeSeries: [{ key: 1, key_as_string: '1970', doc_count: 7 }],
  recoveredSeries: [{ key: 1, key_as_string: '1970', doc_count: 2 }],
  ...overrides,
});

const buildQueryResult = (
  overrides: Partial<UseQueryResult<AlertSummaryResponse, Error>> = {}
): Partial<UseQueryResult<AlertSummaryResponse, Error>> =>
  ({
    data: undefined,
    isLoading: false,
    isError: false,
    ...overrides,
  } as unknown as Partial<UseQueryResult<AlertSummaryResponse, Error>>);

describe('AlertActivityCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseService.mockImplementation(() => ({
      theme: { useChartsBaseTheme: () => ({}) },
    }));
  });

  const defaultProps = {
    ruleIds: ['rule-1'],
    timeRange: { gte: '2025-01-01T00:00:00.000Z', lte: '2025-01-02T00:00:00.000Z' },
    fixedInterval: '1 hour',
  };

  it('forwards params to useFetchAlertSummary', () => {
    mockUseFetchAlertSummary.mockReturnValue(buildQueryResult());
    render(<AlertActivityCard {...defaultProps} />);
    expect(mockUseFetchAlertSummary).toHaveBeenCalledWith({
      ruleIds: ['rule-1'],
      gte: '2025-01-01T00:00:00.000Z',
      lte: '2025-01-02T00:00:00.000Z',
      fixedInterval: '1 hour',
    });
  });

  it('renders loading state', () => {
    mockUseFetchAlertSummary.mockReturnValue(buildQueryResult({ isLoading: true }));
    render(<AlertActivityCard {...defaultProps} />);
    expect(screen.getByTestId('alertActivityCardLoading')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseFetchAlertSummary.mockReturnValue(buildQueryResult({ isError: true }));
    render(<AlertActivityCard {...defaultProps} />);
    expect(screen.getByTestId('alertActivityCardError')).toBeInTheDocument();
  });

  it('renders data for a single rule', () => {
    mockUseFetchAlertSummary.mockReturnValue(buildQueryResult({ data: buildData() }));
    render(<AlertActivityCard {...defaultProps} />);
    expect(screen.getByTestId('alertActivityCardActive').textContent).toContain('7');
    expect(screen.getByTestId('alertActivityCardRecovered').textContent).toContain('2');
  });

  it('renders data for multiple rules', () => {
    mockUseFetchAlertSummary.mockReturnValue(
      buildQueryResult({
        data: buildData({ activeEventCount: 12, recoveredEventCount: 4 }),
      })
    );
    render(
      <AlertActivityCard
        {...defaultProps}
        ruleIds={['rule-1', 'rule-2', 'rule-3']}
        lookbackLabel="Last 30 days"
      />
    );
    expect(screen.getByTestId('alertActivityCardActive').textContent).toContain('12');
    expect(screen.getByTestId('alertActivityCardLookback')).toHaveTextContent('Last 30 days');
  });

  it('renders empty data without errors', () => {
    mockUseFetchAlertSummary.mockReturnValue(
      buildQueryResult({
        data: buildData({
          activeEventCount: 0,
          recoveredEventCount: 0,
          activeSeries: [],
          recoveredSeries: [],
        }),
      })
    );
    render(<AlertActivityCard {...defaultProps} />);
    expect(screen.getByTestId('alertActivityCardActive').textContent).toContain('0');
    expect(screen.getByTestId('alertActivityCardRecovered').textContent).toContain('0');
  });
});
