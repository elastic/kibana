/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { act, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { DiscoverADAnomalyFlyout } from './flyout';
import { useAnomalyData } from './use_anomaly_data';

let mockResize: (size: { width: number; height: number }) => void = () => {};
jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  EuiResizeObserver: ({
    onResize,
    children,
  }: {
    onResize: typeof mockResize;
    children: (ref: () => void) => React.ReactNode;
  }) => {
    mockResize = onResize;
    return children(() => {});
  },
}));

const mockChartsMounted = jest.fn();
const MockCharts = () => {
  useEffect(() => mockChartsMounted(), []);
  return <div data-test-subj="charts" />;
};

jest.mock('./use_anomaly_data', () => ({
  useAnomalyData: jest.fn(),
}));
jest.mock('../../../application/components/controls/select_severity/select_severity', () => ({
  useDefaultSeverity: () => ({ val: DEFAULT_SEVERITY }),
}));
jest.mock('../../../application/contexts/kibana', () => ({
  useMlKibana: () => ({
    services: {
      uiSettings: { get: () => undefined },
      share: { url: { locators: { get: () => ({ locator: true }) } } },
      charts: {},
      data: { query: { timefilter: { timefilter: { getBounds: () => ({}) } } } },
    },
  }),
}));
jest.mock('./ai_summary', () => ({
  AiSummary: () => <div data-test-subj="aiSummary" />,
}));
jest.mock('../../../application/explorer/explorer_charts/explorer_anomalies_container', () => ({
  ExplorerAnomaliesContainer: () => <MockCharts />,
}));
jest.mock('../../../application/components/anomalies_table/anomalies_table', () => ({
  AnomaliesTable: () => <div data-test-subj="table" />,
}));

const DEFAULT_SEVERITY = [{ min: 0, max: 3 }, { min: 3 }];
const props = { jobId: 'my-job', timestamp: 1700000000000, endTimestamp: 1700003600000, score: 73 };
const loaded = {
  isLoading: false,
  jobs: [],
  tableData: { anomalies: [] },
  chartsData: { seriesToPlot: [] },
};

const renderIt = (isAiAvailable?: boolean) =>
  render(
    <I18nProvider>
      <DiscoverADAnomalyFlyout {...props} isAiAvailable={isAiAvailable} />
    </I18nProvider>
  );

describe('DiscoverADAnomalyFlyout', () => {
  it('has the title Anomaly', () => {
    (useAnomalyData as jest.Mock).mockReturnValue({ isLoading: true });
    renderIt();
    expect(screen.getByTestId('mlDiscoverADAnomalyFlyoutTitle')).toHaveTextContent('Anomaly');
  });

  it('loads the data of the job in the time range, once the width is known', () => {
    (useAnomalyData as jest.Mock).mockReturnValue({ isLoading: true });
    renderIt();
    expect(useAnomalyData).toHaveBeenCalledWith({
      jobId: 'my-job',
      timestamp: 1700000000000,
      endTimestamp: 1700003600000,
      chartWidth: 0,
      severity: DEFAULT_SEVERITY,
    });
  });

  it('shows the charts and the table', () => {
    (useAnomalyData as jest.Mock).mockReturnValue(loaded);
    renderIt();
    expect(screen.getByTestId('charts')).toBeInTheDocument();
    expect(screen.getByTestId('table')).toBeInTheDocument();
  });

  it('shows the error when the data could not be loaded', () => {
    (useAnomalyData as jest.Mock).mockReturnValue({ isLoading: false, error: 'boom' });
    renderIt();
    expect(screen.getByTestId('mlDiscoverADAnomalyError')).toHaveTextContent('boom');
    expect(screen.queryByTestId('table')).not.toBeInTheDocument();
  });

  it('shows the AI summary section only when AI is available', () => {
    (useAnomalyData as jest.Mock).mockReturnValue(loaded);
    const { unmount } = renderIt(true);
    expect(screen.getByTestId('aiSummary')).toBeInTheDocument();
    unmount();

    renderIt(false);
    expect(screen.queryByTestId('aiSummary')).not.toBeInTheDocument();
  });

  it('loads the data for the first width, and draws the charts again when resized', () => {
    (useAnomalyData as jest.Mock).mockReturnValue(loaded);
    renderIt();
    act(() => mockResize({ width: 600, height: 400 }));
    mockChartsMounted.mockClear();
    (useAnomalyData as jest.Mock).mockClear();

    act(() => mockResize({ width: 900, height: 400 }));

    expect(useAnomalyData).toHaveBeenLastCalledWith(expect.objectContaining({ chartWidth: 600 }));
    expect(mockChartsMounted).toHaveBeenCalledTimes(1);
  });

  it('does not draw the charts again for a small change in width', () => {
    (useAnomalyData as jest.Mock).mockReturnValue(loaded);
    renderIt();
    act(() => mockResize({ width: 600, height: 400 }));
    mockChartsMounted.mockClear();

    act(() => mockResize({ width: 610, height: 400 }));

    expect(mockChartsMounted).not.toHaveBeenCalled();
  });
});
