/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SignalFiringsChart, type SignalFiringsChartProps } from './signal_firings_chart';

const mockSettings = vi.fn();
const mockHistogramBarSeries = vi.fn();
const mockAxis = vi.fn();

vi.mock('@elastic/charts', () => {
  const mocked = {
    Chart: ({ children }: { children: React.ReactNode }) => (
      <div data-test-subj="signalFiringsChart">{children}</div>
    ),
    Settings: (props: Record<string, unknown>) => {
      mockSettings(props);
      return null;
    },
    HistogramBarSeries: (props: Record<string, unknown>) => {
      mockHistogramBarSeries(props);
      return null;
    },
    Axis: (props: Record<string, unknown>) => {
      mockAxis(props);
      return null;
    },
    Position: { Left: 'left', Bottom: 'bottom' },
    ScaleType: { Time: 'time', Linear: 'linear' },
  };
  return { ...mocked, default: mocked };
});

const mockBaseTheme = { lineSeriesStyle: {} };
const mockUseChartsBaseTheme = vi.fn(() => mockBaseTheme);

vi.mock('@kbn/core-di-browser', () => {
  const mocked = {
    useService: () => ({ theme: { useChartsBaseTheme: mockUseChartsBaseTheme } }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/core-di', () => {
  const mocked = {
    PluginStart: (key: string) => key,
  };
  return { ...mocked, default: mocked };
});

const BASE_GTE_MS = 1_700_000_000_000;
const BASE_LTE_MS = BASE_GTE_MS + 24 * 60 * 60 * 1000;
const BUCKET_INTERVAL_MS = 60 * 60 * 1000; // 1h

const defaultProps: SignalFiringsChartProps = {
  buckets: [
    { timeMs: BASE_GTE_MS, count: 3 },
    { timeMs: BASE_GTE_MS + BUCKET_INTERVAL_MS, count: 7 },
  ],
  gteMs: BASE_GTE_MS,
  lteMs: BASE_LTE_MS,
  minIntervalMs: BUCKET_INTERVAL_MS,
  onBrushRange: vi.fn(),
};

const renderChart = (props: Partial<SignalFiringsChartProps> = {}) =>
  render(<SignalFiringsChart {...defaultProps} {...props} />);

describe('SignalFiringsChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the chart container', () => {
    renderChart();
    expect(screen.getByTestId('signalFiringsChart')).toBeInTheDocument();
  });

  it('passes minIntervalMs to xDomain.minInterval so sparse buckets render at full width', () => {
    const minIntervalMs = 4 * 60 * 60 * 1000; // 4h bucket
    renderChart({ minIntervalMs });
    expect(mockSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        xDomain: expect.objectContaining({ minInterval: minIntervalMs }),
      })
    );
  });

  it('sets xDomain min/max to gteMs/lteMs', () => {
    renderChart();
    expect(mockSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        xDomain: expect.objectContaining({ min: BASE_GTE_MS, max: BASE_LTE_MS }),
      })
    );
  });

  it('passes bucket data to the bar series', () => {
    renderChart();
    expect(mockHistogramBarSeries).toHaveBeenCalledWith(
      expect.objectContaining({ data: defaultProps.buckets })
    );
  });

  it('calls onBrushRange with the selected epoch ms range', () => {
    const onBrushRange = vi.fn();
    renderChart({ onBrushRange });

    const [[settingsProps]] = mockSettings.mock.calls;
    const fromMs = BASE_GTE_MS + 2 * BUCKET_INTERVAL_MS;
    const toMs = BASE_GTE_MS + 5 * BUCKET_INTERVAL_MS;
    settingsProps.onBrushEnd({ x: [fromMs, toMs] });

    expect(onBrushRange).toHaveBeenCalledWith(fromMs, toMs);
  });

  it('does not call onBrushRange when the brush event has no x range', () => {
    const onBrushRange = vi.fn();
    renderChart({ onBrushRange });

    const [[settingsProps]] = mockSettings.mock.calls;
    settingsProps.onBrushEnd({});

    expect(onBrushRange).not.toHaveBeenCalled();
  });
});
