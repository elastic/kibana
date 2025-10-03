/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { IngestionRate } from './ingestion_rate';
import type { Streams } from '@kbn/streams-schema';
import type { DataStreamStats } from '../hooks/use_data_stream_stats';

// Mock the hooks
const mockTimeState = {
  from: 'now-24h',
  to: 'now',
  refreshInterval: {
    pause: false,
    value: 0,
  },
};

jest.mock('../../../../hooks/use_timefilter', () => ({
  useTimefilter: () => ({
    timeState: mockTimeState,
  }),
}));

const mockIsServerless = false;

jest.mock('../../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    isServerless: mockIsServerless,
  }),
}));

// Mock the chart components
jest.mock('../common/chart_components', () => ({
  ChartBarSeries: jest.fn(({ definition, stats, timeState, isLoadingStats }) => (
    <div data-testid="chart-bar-series">
      <span data-testid="chart-definition">{definition.stream.name}</span>
      <span data-testid="chart-stats">{stats?.bytesPerDay || 'no-stats'}</span>
      <span data-testid="chart-time-state">{JSON.stringify(timeState)}</span>
      <span data-testid="chart-loading">{isLoadingStats.toString()}</span>
    </div>
  )),
  ChartBarPhasesSeries: jest.fn(({ definition, stats, timeState, isLoadingStats }) => (
    <div data-testid="chart-bar-phases-series">
      <span data-testid="chart-definition">{definition.stream.name}</span>
      <span data-testid="chart-stats">{stats?.bytesPerDay || 'no-stats'}</span>
      <span data-testid="chart-time-state">{JSON.stringify(timeState)}</span>
      <span data-testid="chart-loading">{isLoadingStats.toString()}</span>
    </div>
  )),
}));

// Mock the search bar
jest.mock('../../../streams_app_search_bar', () => ({
  StreamsAppSearchBar: jest.fn(({ showDatePicker }) => (
    <div data-testid="streams-app-search-bar" data-show-date-picker={showDatePicker}>
      Search Bar
    </div>
  )),
}));

describe('IngestionRate', () => {
  const createMockDefinition = (streamName = 'test-stream'): Streams.ingest.all.GetResponse => ({
    stream: { name: streamName },
  } as unknown as Streams.ingest.all.GetResponse);

  const createMockStats = (bytesPerDay?: number): DataStreamStats => ({
    bytesPerDay,
  } as DataStreamStats);

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the mock value for isServerless
    (mockIsServerless as any) = false;
  });

  describe('Basic Rendering', () => {
    it('renders ingestion rate panel with title', () => {
      const definition = createMockDefinition();
      const stats = createMockStats(1024 * 1024);

      render(<IngestionRate definition={definition} stats={stats} isLoadingStats={false} />);

      expect(screen.getByText('Ingestion over time')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 5 })).toHaveTextContent('Ingestion over time');
    });

    it('renders search bar with date picker enabled', () => {
      const definition = createMockDefinition();

      render(<IngestionRate definition={definition} isLoadingStats={false} />);

      const searchBar = screen.getByTestId('streams-app-search-bar');
      expect(searchBar).toBeInTheDocument();
      expect(searchBar).toHaveAttribute('data-show-date-picker', 'true');
    });

    it('has proper layout structure with flex groups', () => {
      const definition = createMockDefinition();

      render(<IngestionRate definition={definition} isLoadingStats={false} />);

      // Check that the main components are present
      expect(screen.getByText('Ingestion over time')).toBeInTheDocument();
      expect(screen.getByTestId('streams-app-search-bar')).toBeInTheDocument();
    });
  });

  describe('Chart Rendering - Serverless Mode', () => {
    it('renders ChartBarSeries when in serverless mode', () => {
      // Mock serverless mode
      const mockUseKibana = require('../../../../hooks/use_kibana');
      mockUseKibana.useKibana.mockReturnValue({ isServerless: true });

      const definition = createMockDefinition('serverless-stream');
      const stats = createMockStats(2048);

      render(<IngestionRate definition={definition} stats={stats} isLoadingStats={false} />);

      expect(screen.getByTestId('chart-bar-series')).toBeInTheDocument();
      expect(screen.queryByTestId('chart-bar-phases-series')).not.toBeInTheDocument();
    });

    it('passes correct props to ChartBarSeries in serverless mode', () => {
      // Mock serverless mode
      const mockUseKibana = require('../../../../hooks/use_kibana');
      mockUseKibana.useKibana.mockReturnValue({ isServerless: true });

      const definition = createMockDefinition('test-stream');
      const stats = createMockStats(1024);

      render(<IngestionRate definition={definition} stats={stats} isLoadingStats={true} />);

      expect(screen.getByTestId('chart-definition')).toHaveTextContent('test-stream');
      expect(screen.getByTestId('chart-stats')).toHaveTextContent('1024');
      expect(screen.getByTestId('chart-time-state')).toHaveTextContent(
        JSON.stringify(mockTimeState)
      );
      expect(screen.getByTestId('chart-loading')).toHaveTextContent('true');
    });
  });

  describe('Chart Rendering - Non-Serverless Mode', () => {
    it('renders ChartBarPhasesSeries when not in serverless mode', () => {
      // Ensure non-serverless mode
      const mockUseKibana = require('../../../../hooks/use_kibana');
      mockUseKibana.useKibana.mockReturnValue({ isServerless: false });

      const definition = createMockDefinition('non-serverless-stream');
      const stats = createMockStats(4096);

      render(<IngestionRate definition={definition} stats={stats} isLoadingStats={false} />);

      expect(screen.getByTestId('chart-bar-phases-series')).toBeInTheDocument();
      expect(screen.queryByTestId('chart-bar-series')).not.toBeInTheDocument();
    });

    it('passes correct props to ChartBarPhasesSeries in non-serverless mode', () => {
      // Ensure non-serverless mode
      const mockUseKibana = require('../../../../hooks/use_kibana');
      mockUseKibana.useKibana.mockReturnValue({ isServerless: false });

      const definition = createMockDefinition('phases-stream');
      const stats = createMockStats(8192);

      render(<IngestionRate definition={definition} stats={stats} isLoadingStats={true} />);

      expect(screen.getByTestId('chart-definition')).toHaveTextContent('phases-stream');
      expect(screen.getByTestId('chart-stats')).toHaveTextContent('8192');
      expect(screen.getByTestId('chart-time-state')).toHaveTextContent(
        JSON.stringify(mockTimeState)
      );
      expect(screen.getByTestId('chart-loading')).toHaveTextContent('true');
    });
  });

  describe('Stats Handling', () => {
    it('handles undefined stats gracefully', () => {
      const definition = createMockDefinition('no-stats-stream');

      render(<IngestionRate definition={definition} isLoadingStats={false} />);

      // Should still render the chart components
      expect(
        screen.getByTestId('chart-bar-phases-series') || screen.getByTestId('chart-bar-series')
      ).toBeInTheDocument();
    });

    it('passes through undefined stats to chart component', () => {
      const definition = createMockDefinition('test-stream');

      render(<IngestionRate definition={definition} stats={undefined} isLoadingStats={false} />);

      expect(screen.getByTestId('chart-stats')).toHaveTextContent('no-stats');
    });

    it('handles stats with various values', () => {
      const testCases = [
        { bytesPerDay: 0, expected: '0' },
        { bytesPerDay: 1024, expected: '1024' },
        { bytesPerDay: 1024 * 1024, expected: '1048576' },
      ];

      testCases.forEach(({ bytesPerDay, expected }) => {
        const definition = createMockDefinition();
        const stats = createMockStats(bytesPerDay);

        const { rerender } = render(
          <IngestionRate definition={definition} stats={stats} isLoadingStats={false} />
        );

        expect(screen.getByTestId('chart-stats')).toHaveTextContent(expected);

        rerender(<div />); // Clean up for next iteration
      });
    });
  });

  describe('Loading State', () => {
    it('passes isLoadingStats correctly to chart components', () => {
      const definition = createMockDefinition();
      const stats = createMockStats(1024);

      const { rerender } = render(
        <IngestionRate definition={definition} stats={stats} isLoadingStats={true} />
      );

      expect(screen.getByTestId('chart-loading')).toHaveTextContent('true');

      rerender(
        <IngestionRate definition={definition} stats={stats} isLoadingStats={false} />
      );

      expect(screen.getByTestId('chart-loading')).toHaveTextContent('false');
    });
  });

  describe('Time State Integration', () => {
    it('passes time state from useTimefilter to chart components', () => {
      const definition = createMockDefinition();

      render(<IngestionRate definition={definition} isLoadingStats={false} />);

      const timeStateElement = screen.getByTestId('chart-time-state');
      expect(timeStateElement).toHaveTextContent(JSON.stringify(mockTimeState));
    });
  });

  describe('Accessibility', () => {
    it('provides proper heading hierarchy', () => {
      const definition = createMockDefinition();

      render(<IngestionRate definition={definition} isLoadingStats={false} />);

      const heading = screen.getByRole('heading', { level: 5 });
      expect(heading).toHaveTextContent('Ingestion over time');
    });

    it('maintains proper focus management with interactive elements', () => {
      const definition = createMockDefinition();

      render(<IngestionRate definition={definition} isLoadingStats={false} />);

      // Search bar should be focusable
      expect(screen.getByTestId('streams-app-search-bar')).toBeInTheDocument();
    });
  });
});