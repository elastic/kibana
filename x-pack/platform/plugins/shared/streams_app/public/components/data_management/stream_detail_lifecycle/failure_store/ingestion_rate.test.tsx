/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { FailureStoreIngestionRate } from './ingestion_rate';

// Mock timefilter hook to provide deterministic timeState
jest.mock('../../../../hooks/use_timefilter', () => ({
  useTimefilter: () => ({ timeState: { from: 111, to: 222 } }),
}));

// Capture props passed to the chart component
let lastChartProps: any;
jest.mock('../common/chart_components', () => ({
  FailureStoreChartBarSeries: (p: any) => {
    lastChartProps = p; // store for assertions
    return <div data-test-subj="failureStoreChart" />;
  },
}));

// Mock search bar to assert showDatePicker flag
jest.mock('../../../streams_app_search_bar', () => ({
  StreamsAppSearchBar: (p: any) => (
    <div data-test-subj="streamsAppSearchBar" data-show-date-picker={String(!!p.showDatePicker)} />
  ),
}));

// Helper render with i18n
const renderI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('FailureStoreIngestionRate', () => {
  const definition = { id: 'stream-1' } as any;
  const statsA = { points: [1, 2, 3] } as any;
  const statsB = { points: [4, 5] } as any;

  beforeEach(() => {
    lastChartProps = undefined;
  });

  it('renders heading, search bar, and chart with initial props', () => {
    renderI18n(
      <FailureStoreIngestionRate definition={definition} stats={statsA} isLoadingStats={false} />
    );

    // Heading text
    expect(
      screen.getByRole('heading', { name: /Failure ingestion rate over time/i })
    ).toBeInTheDocument();

    // Search bar should indicate date picker enabled
    expect(screen.getByTestId('streamsAppSearchBar')).toHaveAttribute(
      'data-show-date-picker',
      'true'
    );

    // Chart placeholder present
    expect(screen.getByTestId('failureStoreChart')).toBeInTheDocument();

    // Props passed to chart component
    expect(lastChartProps.definition).toBe(definition);
    expect(lastChartProps.stats).toBe(statsA);
    expect(lastChartProps.isLoadingStats).toBe(false);
    expect(lastChartProps.timeState).toEqual({ from: 111, to: 222 });
  });

  it('updates chart props on rerender when stats or loading state change', () => {
    const { rerender } = renderI18n(
      <FailureStoreIngestionRate definition={definition} stats={statsA} isLoadingStats={false} />
    );

    // Initial assert
    expect(lastChartProps.stats).toBe(statsA);
    expect(lastChartProps.isLoadingStats).toBe(false);

    rerender(
      <I18nProvider>
        <FailureStoreIngestionRate definition={definition} stats={statsB} isLoadingStats={true} />
      </I18nProvider>
    );

    expect(lastChartProps.stats).toBe(statsB);
    expect(lastChartProps.isLoadingStats).toBe(true);
  });
});
