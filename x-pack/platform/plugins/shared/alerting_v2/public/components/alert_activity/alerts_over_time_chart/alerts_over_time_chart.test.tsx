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
  LineSeries: ({ id }: { id: string }) => <div data-test-subj={`mock-line-series-${id}`} />,
  Settings: () => <div data-test-subj="mock-settings" />,
  Axis: () => null,
  Tooltip: () => null,
  CurveType: { CURVE_MONOTONE_X: 'CURVE_MONOTONE_X' },
  ScaleType: { Time: 'time', Linear: 'linear' },
  Position: { Right: 'right', Bottom: 'bottom', Left: 'left' },
}));

jest.mock('@kbn/core-di-browser', () => ({
  useService: jest.fn(),
  CoreStart: jest.fn((key: string) => `core:${key}`),
}));

jest.mock('@kbn/core-di', () => ({
  PluginStart: jest.fn((key: string) => `plugin:${key}`),
}));

const mockUseFetchAlertSummary = jest.fn();
jest.mock('../../../hooks/use_fetch_alert_summary', () => ({
  useFetchAlertSummary: (params: unknown) => mockUseFetchAlertSummary(params),
}));

const mockGetDiscoverHref = jest.fn();
jest.mock('../../../utils/discover_href_for_rule_events', () => ({
  getDiscoverHrefForRuleEvents: (args: unknown) => mockGetDiscoverHref(args),
}));

import { useService, CoreStart } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import { AlertsOverTimeChart } from './alerts_over_time_chart';

const mockUseService = useService as jest.MockedFunction<typeof useService>;
const mockPluginStart = PluginStart as jest.MockedFunction<typeof PluginStart>;
const mockCoreStart = CoreStart as jest.MockedFunction<typeof CoreStart>;

const buildData = (overrides: Partial<AlertSummaryResponse> = {}): AlertSummaryResponse => ({
  activeEventCount: 6,
  recoveredEventCount: 3,
  activeSeries: [{ key: 1, key_as_string: '1970', doc_count: 6 }],
  recoveredSeries: [{ key: 1, key_as_string: '1970', doc_count: 3 }],
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

describe('AlertsOverTimeChart', () => {
  const chartsService = { theme: { useChartsBaseTheme: () => ({}) } };
  const shareService = { url: { locators: { get: () => undefined } } };
  const uiSettings = {};
  const application = { capabilities: {} };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPluginStart.mockImplementation((key) => `plugin:${String(key)}` as any);
    mockCoreStart.mockImplementation((key) => `core:${String(key)}` as any);
    mockUseService.mockImplementation((service: unknown) => {
      if (service === 'plugin:charts') return chartsService;
      if (service === 'plugin:share') return shareService;
      if (service === 'core:uiSettings') return uiSettings;
      if (service === 'core:application') return application;
      return undefined as any;
    });
  });

  const defaultProps = {
    ruleIds: ['rule-1'],
    timeRange: { gte: '2025-01-01T00:00:00.000Z', lte: '2025-01-02T00:00:00.000Z' },
    fixedInterval: '1 hour',
    discoverTimeRange: { from: 'now-24h', to: 'now' },
  };

  it('forwards params to useFetchAlertSummary', () => {
    mockUseFetchAlertSummary.mockReturnValue(buildQueryResult());
    mockGetDiscoverHref.mockReturnValue(undefined);
    render(<AlertsOverTimeChart {...defaultProps} />);
    expect(mockUseFetchAlertSummary).toHaveBeenCalledWith({
      ruleIds: ['rule-1'],
      gte: '2025-01-01T00:00:00.000Z',
      lte: '2025-01-02T00:00:00.000Z',
      fixedInterval: '1 hour',
    });
  });

  it('renders loading state', () => {
    mockUseFetchAlertSummary.mockReturnValue(buildQueryResult({ isLoading: true }));
    mockGetDiscoverHref.mockReturnValue(undefined);
    render(<AlertsOverTimeChart {...defaultProps} />);
    expect(screen.getByTestId('alertsOverTimeChartLoading')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseFetchAlertSummary.mockReturnValue(buildQueryResult({ isError: true }));
    mockGetDiscoverHref.mockReturnValue(undefined);
    render(<AlertsOverTimeChart {...defaultProps} />);
    expect(screen.getByTestId('alertsOverTimeChartError')).toBeInTheDocument();
  });

  it('renders empty state when response is all zeros', () => {
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
    mockGetDiscoverHref.mockReturnValue(undefined);
    render(<AlertsOverTimeChart {...defaultProps} />);
    expect(screen.getByTestId('alertsOverTimeChartEmpty')).toBeInTheDocument();
  });

  it('renders data for a single rule', () => {
    mockUseFetchAlertSummary.mockReturnValue(buildQueryResult({ data: buildData() }));
    mockGetDiscoverHref.mockReturnValue(undefined);
    render(<AlertsOverTimeChart {...defaultProps} />);
    expect(screen.getByTestId('alertsOverTimeChartContainer')).toBeInTheDocument();
    expect(screen.getByTestId('mock-line-series-Active')).toBeInTheDocument();
    expect(screen.getByTestId('mock-line-series-Recovered')).toBeInTheDocument();
  });

  it('renders data for multiple rules', () => {
    mockUseFetchAlertSummary.mockReturnValue(
      buildQueryResult({
        data: buildData({ activeEventCount: 21, recoveredEventCount: 10 }),
      })
    );
    mockGetDiscoverHref.mockReturnValue(undefined);
    render(<AlertsOverTimeChart {...defaultProps} ruleIds={['rule-1', 'rule-2', 'rule-3']} />);
    expect(screen.getByTestId('alertsOverTimeChartContainer')).toBeInTheDocument();
  });

  it('renders the Discover link when a href is produced', () => {
    mockUseFetchAlertSummary.mockReturnValue(buildQueryResult({ data: buildData() }));
    mockGetDiscoverHref.mockReturnValue('/app/discover#/foo');
    render(<AlertsOverTimeChart {...defaultProps} />);

    const link = screen.getByTestId('alertsOverTimeChartDiscoverLink') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/app/discover#/foo');
    expect(mockGetDiscoverHref).toHaveBeenCalledWith(
      expect.objectContaining({
        ruleIds: ['rule-1'],
        timeRange: { from: 'now-24h', to: 'now' },
      })
    );
  });

  it('omits the Discover link when the util returns undefined', () => {
    mockUseFetchAlertSummary.mockReturnValue(buildQueryResult({ data: buildData() }));
    mockGetDiscoverHref.mockReturnValue(undefined);
    render(<AlertsOverTimeChart {...defaultProps} />);
    expect(screen.queryByTestId('alertsOverTimeChartDiscoverLink')).not.toBeInTheDocument();
  });
});
