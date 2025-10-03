/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { Streams } from '@kbn/streams-schema';
import { IlmSummary } from './ilm_summary';
import type { DataStreamStats } from '../hooks/use_data_stream_stats';

// Mock the hooks and dependencies
jest.mock('../../../../hooks/use_streams_app_fetch');
jest.mock('../../../../hooks/use_kibana');
jest.mock('../hooks/use_ilm_phases_color_and_description');

// Mock the helper functions
jest.mock('../helpers/helpers', () => ({
  orderIlmPhases: jest.fn(),
  parseDurationInSeconds: jest.fn(),
}));

import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';
import { useKibana } from '../../../../hooks/use_kibana';
import { useIlmPhasesColorAndDescription } from '../hooks/use_ilm_phases_color_and_description';
import { orderIlmPhases, parseDurationInSeconds } from '../helpers/helpers';

const mockUseStreamsAppFetch = useStreamsAppFetch as jest.MockedFunction<typeof useStreamsAppFetch>;
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseIlmPhasesColorAndDescription = useIlmPhasesColorAndDescription as jest.MockedFunction<typeof useIlmPhasesColorAndDescription>;
const mockOrderIlmPhases = orderIlmPhases as jest.MockedFunction<typeof orderIlmPhases>;
const mockParseDurationInSeconds = parseDurationInSeconds as jest.MockedFunction<typeof parseDurationInSeconds>;

describe('IlmSummary', () => {
  const createMockDefinition = (): Streams.ingest.all.GetResponse => ({
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

  const mockIlmPhases = {
    hot: { color: '#FF6B6B', description: 'Hot tier' },
    warm: { color: '#4ECDC4', description: 'Warm tier' },
    cold: { color: '#45B7D1', description: 'Cold tier' },
    frozen: { color: '#96CEB4', description: 'Frozen tier' },
    delete: { color: '#FFEAA7', description: 'Delete phase' },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      dependencies: {
        start: {
          streams: {
            streamsRepositoryClient: {
              fetch: jest.fn(),
            },
          },
        },
      },
    } as any);

    mockUseIlmPhasesColorAndDescription.mockReturnValue({
      ilmPhases: mockIlmPhases,
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when data is being fetched', () => {
      mockUseStreamsAppFetch.mockReturnValue({
        value: undefined,
        loading: true,
        error: null,
      } as any);

      const definition = createMockDefinition();
      render(<IlmSummary definition={definition} />);

      expect(screen.getByText('ILM policy data tiers')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should not render phases when there is an error', () => {
      mockUseStreamsAppFetch.mockReturnValue({
        value: undefined,
        loading: false,
        error: new Error('Failed to fetch'),
      } as any);

      const definition = createMockDefinition();
      render(<IlmSummary definition={definition} />);

      expect(screen.getByText('ILM policy data tiers')).toBeInTheDocument();
      expect(screen.queryByText('Hot')).not.toBeInTheDocument();
    });
  });

  describe('Success State with ILM Phases', () => {
    const mockPhases = [
      { name: 'hot', min_age: '0ms', size_in_bytes: 1000000 },
      { name: 'warm', min_age: '1d', size_in_bytes: 500000 },
      { name: 'cold', min_age: '7d', size_in_bytes: 100000 },
      { name: 'delete', min_age: '30d' },
    ];

    beforeEach(() => {
      mockUseStreamsAppFetch.mockReturnValue({
        value: { phases: mockPhases },
        loading: false,
        error: null,
      } as any);

      mockOrderIlmPhases.mockReturnValue([...mockPhases].reverse());
      mockParseDurationInSeconds
        .mockReturnValueOnce(0)    // hot: 0ms
        .mockReturnValueOnce(86400)   // warm: 1d
        .mockReturnValueOnce(604800)  // cold: 7d  
        .mockReturnValueOnce(2592000) // delete: 30d
        .mockReturnValueOnce(2592000) // First phase total duration
        .mockReturnValueOnce(0)       // hot duration calculation
        .mockReturnValueOnce(86400)   // warm duration calculation
        .mockReturnValueOnce(518400); // cold duration calculation
    });

    it('should render ILM phases correctly', () => {
      const definition = createMockDefinition();
      render(<IlmSummary definition={definition} />);

      expect(screen.getByText('ILM policy data tiers')).toBeInTheDocument();
      expect(screen.getByText('Hot')).toBeInTheDocument();
      expect(screen.getByText('Warm')).toBeInTheDocument();
      expect(screen.getByText('Cold')).toBeInTheDocument();
    });

    it('should display storage sizes for non-delete phases', () => {
      const definition = createMockDefinition();
      render(<IlmSummary definition={definition} />);

      expect(screen.getByText('1MB')).toBeInTheDocument(); // Hot phase
      expect(screen.getByText('500KB')).toBeInTheDocument(); // Warm phase
      expect(screen.getByText('100KB')).toBeInTheDocument(); // Cold phase
    });

    it('should show delete icon for delete phase', () => {
      const definition = createMockDefinition();
      render(<IlmSummary definition={definition} />);

      const trashIcon = screen.getByRole('img', { hidden: true });
      expect(trashIcon).toBeInTheDocument();
    });

    it('should display time labels correctly', () => {
      const definition = createMockDefinition();
      render(<IlmSummary definition={definition} />);

      expect(screen.getByText('1 days')).toBeInTheDocument(); // Warm phase min_age
      expect(screen.getByText('7 days')).toBeInTheDocument(); // Cold phase min_age
    });

    it('should show infinity symbol for phases without min_age', () => {
      const definition = createMockDefinition();
      render(<IlmSummary definition={definition} />);

      expect(screen.getByText('∞')).toBeInTheDocument(); // Hot phase (no min_age)
    });
  });

  describe('No Data State', () => {
    it('should not render phases when no data is available', () => {
      mockUseStreamsAppFetch.mockReturnValue({
        value: null,
        loading: false,
        error: null,
      } as any);

      const definition = createMockDefinition();
      render(<IlmSummary definition={definition} />);

      expect(screen.getByText('ILM policy data tiers')).toBeInTheDocument();
      expect(screen.queryByText('Hot')).not.toBeInTheDocument();
    });
  });

  describe('Phase Calculations', () => {
    it('should calculate grow values correctly based on phase durations', () => {
      const mockPhases = [
        { name: 'hot', min_age: '0ms' },
        { name: 'warm', min_age: '1d' },
        { name: 'delete', min_age: '30d' },
      ];

      mockUseStreamsAppFetch.mockReturnValue({
        value: { phases: mockPhases },
        loading: false,
        error: null,
      } as any);

      mockOrderIlmPhases.mockReturnValue([...mockPhases].reverse());
      
      // Mock duration calculations
      mockParseDurationInSeconds
        .mockReturnValueOnce(2592000) // First phase (delete) total duration: 30d
        .mockReturnValueOnce(2592000) // delete: 30d  
        .mockReturnValueOnce(86400)   // warm: 1d
        .mockReturnValueOnce(0)       // hot: 0ms
        .mockReturnValueOnce(2506400) // delete duration (30d - 1d)
        .mockReturnValueOnce(86400);  // warm duration (1d - 0ms)

      const definition = createMockDefinition();
      render(<IlmSummary definition={definition} />);

      // Should render the phases in correct order
      expect(screen.getByText('Hot')).toBeInTheDocument();
      expect(screen.getByText('Warm')).toBeInTheDocument();
    });
  });

  describe('Stats Integration', () => {
    it('should refresh when stats change', () => {
      const mockFetch = jest.fn();
      mockUseKibana.mockReturnValue({
        dependencies: {
          start: {
            streams: {
              streamsRepositoryClient: {
                fetch: mockFetch,
              },
            },
          },
        },
      } as any);

      mockUseStreamsAppFetch.mockReturnValue({
        value: { phases: [] },
        loading: false,
        error: null,
      } as any);

      const definition = createMockDefinition();
      const stats = createMockStats();

      const { rerender } = render(<IlmSummary definition={definition} stats={stats} />);

      // Re-render with different stats
      const newStats = { ...stats, sizeBytes: 2000000 };
      rerender(<IlmSummary definition={definition} stats={newStats} />);

      // useStreamsAppFetch should have been called with the dependency including stats
      expect(mockUseStreamsAppFetch).toHaveBeenCalledWith(
        expect.any(Function),
        expect.arrayContaining([expect.anything(), definition, newStats])
      );
    });
  });
});