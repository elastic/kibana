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

jest.mock('../../../../hooks/use_timefilter');
jest.mock('../common/chart_components');
jest.mock('../../../streams_app_search_bar');

import { useTimefilter } from '../../../../hooks/use_timefilter';
import { FailureStoreChartBarSeries } from '../common/chart_components';
import { StreamsAppSearchBar } from '../../../streams_app_search_bar';

const mockUseTimefilter = useTimefilter as jest.MockedFunction<typeof useTimefilter>;
const mockFailureStoreChartBarSeries = FailureStoreChartBarSeries as jest.MockedFunction<
  typeof FailureStoreChartBarSeries
>;
const mockStreamsAppSearchBar = StreamsAppSearchBar as jest.MockedFunction<
  typeof StreamsAppSearchBar
>;

const renderI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('FailureStoreIngestionRate', () => {
  const definition = { id: 'stream-1' } as any;
  const statsA = { points: [1, 2, 3] } as any;
  const statsB = { points: [4, 5] } as any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseTimefilter.mockReturnValue({
      timeState: { from: 111, to: 222 },
    });

    mockFailureStoreChartBarSeries.mockImplementation(
      ({ definition: def, stats, isLoadingStats }) => (
        <div data-test-subj="failureStoreChart">
          <div>Definition: {def.id}</div>
          <div>Loading: {isLoadingStats.toString()}</div>
          {stats && <div>Stats: {stats.points?.length || 0} points</div>}
        </div>
      )
    );

    mockStreamsAppSearchBar.mockImplementation(({ showDatePicker }) => (
      <div data-test-subj="streamsAppSearchBar" data-show-date-picker={String(!!showDatePicker)} />
    ));
  });

  it('renders heading, search bar, and chart with initial props', () => {
    renderI18n(
      <FailureStoreIngestionRate definition={definition} stats={statsA} isLoadingStats={false} />
    );

    expect(
      screen.getByRole('heading', { name: /Failure ingestion rate over time/i })
    ).toBeInTheDocument();

    expect(screen.getByTestId('streamsAppSearchBar')).toHaveAttribute(
      'data-show-date-picker',
      'true'
    );

    expect(screen.getByTestId('failureStoreChart')).toBeInTheDocument();
    expect(screen.getByText('Definition: stream-1')).toBeInTheDocument();
    expect(screen.getByText('Loading: false')).toBeInTheDocument();
    expect(screen.getByText('Stats: 3 points')).toBeInTheDocument();
  });

  it('updates chart props on rerender when stats or loading state change', () => {
    const { rerender } = renderI18n(
      <FailureStoreIngestionRate definition={definition} stats={statsA} isLoadingStats={false} />
    );

    expect(screen.getByText('Stats: 3 points')).toBeInTheDocument();
    expect(screen.getByText('Loading: false')).toBeInTheDocument();

    rerender(
      <I18nProvider>
        <FailureStoreIngestionRate definition={definition} stats={statsB} isLoadingStats={true} />
      </I18nProvider>
    );

    expect(screen.getByText('Stats: 2 points')).toBeInTheDocument();
    expect(screen.getByText('Loading: true')).toBeInTheDocument();
  });
});
