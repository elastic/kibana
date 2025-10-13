/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { Streams } from '@kbn/streams-schema';
import { IngestionRate } from './ingestion_rate';
import type { DataStreamStats } from '../hooks/use_data_stream_stats';

jest.mock('../../../../hooks/use_timefilter');
jest.mock('../../../../hooks/use_kibana');
jest.mock('../common/chart_components');
jest.mock('../../../streams_app_search_bar');

import { useTimefilter } from '../../../../hooks/use_timefilter';
import { useKibana } from '../../../../hooks/use_kibana';
import { ChartBarSeries, ChartBarPhasesSeries } from '../common/chart_components';
import { StreamsAppSearchBar } from '../../../streams_app_search_bar';

const mockUseTimefilter = useTimefilter as jest.MockedFunction<typeof useTimefilter>;
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockChartBarSeries = ChartBarSeries as jest.MockedFunction<typeof ChartBarSeries>;
const mockChartBarPhasesSeries = ChartBarPhasesSeries as jest.MockedFunction<
  typeof ChartBarPhasesSeries
>;
const mockStreamsAppSearchBar = StreamsAppSearchBar as jest.MockedFunction<
  typeof StreamsAppSearchBar
>;

describe('IngestionRate', () => {
  const createMockDefinition = (): Streams.ingest.all.GetResponse =>
    ({
      stream: {
        name: 'logs-test',
      },
    } as any);

  const createMockStats = (): DataStreamStats => ({
    sizeBytes: 1000000,
    totalDocs: 1000,
    bytesPerDoc: 1000,
    bytesPerDay: 50000,
  });

  const mockTimeState = {
    from: 'now-24h',
    to: 'now',
    refresh: {
      interval: 60000,
      pause: false,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseTimefilter.mockReturnValue({
      timeState: mockTimeState,
    });

    // Mock chart components
    mockChartBarSeries.mockImplementation(({ definition, stats, isLoadingStats }) => (
      <div data-test-subj="chart-bar-series">
        <div>Serverless Chart</div>
        <div>Definition: {definition.stream.name}</div>
        <div>Loading: {isLoadingStats.toString()}</div>
        {stats && <div>Stats: {stats.totalDocs} docs</div>}
      </div>
    ));

    mockChartBarPhasesSeries.mockImplementation(({ definition, stats, isLoadingStats }) => (
      <div data-test-subj="chart-bar-phases-series">
        <div>On-Premise Chart</div>
        <div>Definition: {definition.stream.name}</div>
        <div>Loading: {isLoadingStats.toString()}</div>
        {stats && <div>Stats: {stats.totalDocs} docs</div>}
      </div>
    ));

    mockStreamsAppSearchBar.mockImplementation(({ showDatePicker }) => (
      <div data-test-subj="streams-app-search-bar">
        <div>Search Bar</div>
        <div>Date Picker: {showDatePicker.toString()}</div>
      </div>
    ));
  });

  describe('Component Structure', () => {
    it('should render the ingestion rate panel with correct title', () => {
      mockUseKibana.mockReturnValue({ isServerless: false } as any);

      const definition = createMockDefinition();
      render(<IngestionRate definition={definition} isLoadingStats={false} />);

      expect(screen.getByText('Ingestion over time')).toBeInTheDocument();
    });

    it('should render the search bar with date picker enabled', () => {
      mockUseKibana.mockReturnValue({ isServerless: false } as any);

      const definition = createMockDefinition();
      render(<IngestionRate definition={definition} isLoadingStats={false} />);

      expect(screen.getByTestId('streams-app-search-bar')).toBeInTheDocument();
      expect(screen.getByText('Date Picker: true')).toBeInTheDocument();
    });
  });

  describe('Serverless vs On-Premise Charts', () => {
    it('should render ChartBarSeries for serverless environments', () => {
      mockUseKibana.mockReturnValue({ isServerless: true } as any);

      const definition = createMockDefinition();
      const stats = createMockStats();

      render(<IngestionRate definition={definition} stats={stats} isLoadingStats={false} />);

      expect(screen.getByTestId('chart-bar-series')).toBeInTheDocument();
      expect(screen.getByText('Serverless Chart')).toBeInTheDocument();
      expect(screen.queryByTestId('chart-bar-phases-series')).not.toBeInTheDocument();
    });

    it('should render ChartBarPhasesSeries for on-premise environments', () => {
      mockUseKibana.mockReturnValue({ isServerless: false } as any);

      const definition = createMockDefinition();
      const stats = createMockStats();

      render(<IngestionRate definition={definition} stats={stats} isLoadingStats={false} />);

      expect(screen.getByTestId('chart-bar-phases-series')).toBeInTheDocument();
      expect(screen.getByText('On-Premise Chart')).toBeInTheDocument();
      expect(screen.queryByTestId('chart-bar-series')).not.toBeInTheDocument();
    });
  });

  describe('Stats and Loading State', () => {
    it('should render with stats', () => {
      mockUseKibana.mockReturnValue({ isServerless: true } as any);

      const definition = createMockDefinition();
      const stats = createMockStats();

      render(<IngestionRate definition={definition} stats={stats} isLoadingStats={false} />);

      expect(screen.getByText('Stats: 1000 docs')).toBeInTheDocument();
    });

    it('should handle loading state', () => {
      mockUseKibana.mockReturnValue({ isServerless: true } as any);

      const definition = createMockDefinition();

      render(<IngestionRate definition={definition} isLoadingStats={true} />);

      expect(screen.getByText('Loading: true')).toBeInTheDocument();
    });
  });
});
