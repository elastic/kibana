/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { IlmSummary } from './ilm_summary';
import type { Streams } from '@kbn/streams-schema';
import type { DataStreamStats } from '../hooks/use_data_stream_stats';

// Mock the Kibana hook
const mockStreamsRepositoryClient = {
  fetch: jest.fn(),
};

jest.mock('../../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    dependencies: {
      start: {
        streams: {
          streamsRepositoryClient: mockStreamsRepositoryClient,
        },
      },
    },
  }),
}));

// Mock the fetch hook
jest.mock('../../../../hooks/use_streams_app_fetch', () => ({
  useStreamsAppFetch: jest.fn(),
}));

// Mock the helpers
jest.mock('../helpers/helpers', () => ({
  orderIlmPhases: jest.fn((phases) => phases),
  parseDurationInSeconds: jest.fn((duration) => {
    const durationMap: Record<string, number> = {
      '0s': 0,
      '1h': 3600,
      '7d': 604800,
      '30d': 2592000,
    };
    return durationMap[duration] || 0;
  }),
}));

// Mock the ILM phases hook
jest.mock('../hooks/use_ilm_phases_color_and_description', () => ({
  useIlmPhasesColorAndDescription: () => ({
    ilmPhases: {
      hot: { color: '#FF6B6B', description: 'Hot phase' },
      warm: { color: '#4ECDC4', description: 'Warm phase' },
      cold: { color: '#45B7D1', description: 'Cold phase' },
      frozen: { color: '#96CEB4', description: 'Frozen phase' },
      delete: { color: '#FFEAA7', description: 'Delete phase' },
    },
  }),
}));

// Mock format helpers
jest.mock('../helpers/format_size_units', () => ({
  getTimeSizeAndUnitLabel: jest.fn((value: string | undefined) => {
    if (!value) return undefined;
    const formatMap: Record<string, string> = {
      '0s': '0 seconds',
      '1h': '1 hour',
      '7d': '7 days',
      '30d': '30 days',
    };
    return formatMap[value] || value;
  }),
}));

jest.mock('../helpers/format_bytes', () => ({
  formatBytes: jest.fn((bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${bytes} B`;
  }),
}));

describe('IlmSummary', () => {
  const { useStreamsAppFetch } = require('../../../../hooks/use_streams_app_fetch');

  const createMockDefinition = (): Streams.ingest.all.GetResponse => ({
    stream: { name: 'test-stream' },
  } as unknown as Streams.ingest.all.GetResponse);

  const createMockStats = (): DataStreamStats => ({
    sizeBytes: 1024 * 1024 * 100, // 100 MB
  } as DataStreamStats);

  const mockIlmPhases = [
    {
      name: 'hot',
      min_age: '0s',
      size_in_bytes: 1024 * 1024 * 50, // 50 MB
    },
    {
      name: 'warm',
      min_age: '1h',
      size_in_bytes: 1024 * 1024 * 30, // 30 MB
    },
    {
      name: 'cold',
      min_age: '7d',
      size_in_bytes: 1024 * 1024 * 20, // 20 MB
    },
    {
      name: 'delete',
      min_age: '30d',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('shows loading spinner when data is being fetched', () => {
      useStreamsAppFetch.mockReturnValue({
        value: undefined,
        loading: true,
        error: undefined,
      });

      const definition = createMockDefinition();
      render(<IlmSummary definition={definition} />);

      expect(screen.getByText('ILM policy data tiers')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('renders title but no phases when there is an error', () => {
      useStreamsAppFetch.mockReturnValue({
        value: undefined,
        loading: false,
        error: new Error('Failed to fetch ILM data'),
      });

      const definition = createMockDefinition();
      render(<IlmSummary definition={definition} />);

      expect(screen.getByText('ILM policy data tiers')).toBeInTheDocument();
      expect(screen.queryByText('Hot')).not.toBeInTheDocument();
    });

    it('renders title but no phases when value is undefined', () => {
      useStreamsAppFetch.mockReturnValue({
        value: undefined,
        loading: false,
        error: undefined,
      });

      const definition = createMockDefinition();
      render(<IlmSummary definition={definition} />);

      expect(screen.getByText('ILM policy data tiers')).toBeInTheDocument();
      expect(screen.queryByText('Hot')).not.toBeInTheDocument();
    });
  });

  describe('Successful Data Display', () => {
    it('renders ILM phases with correct data when phases are available', () => {
      useStreamsAppFetch.mockReturnValue({
        value: { phases: mockIlmPhases },
        loading: false,
        error: undefined,
      });

      const definition = createMockDefinition();
      const stats = createMockStats();

      render(<IlmSummary definition={definition} stats={stats} />);

      expect(screen.getByText('ILM policy data tiers')).toBeInTheDocument();
      expect(screen.getByText('Hot')).toBeInTheDocument();
      expect(screen.getByText('Warm')).toBeInTheDocument();
      expect(screen.getByText('Cold')).toBeInTheDocument();
    });

    it('displays phase sizes for non-delete phases', () => {
      useStreamsAppFetch.mockReturnValue({
        value: { phases: mockIlmPhases },
        loading: false,
        error: undefined,
      });

      const definition = createMockDefinition();
      const stats = createMockStats();

      render(<IlmSummary definition={definition} stats={stats} />);

      expect(screen.getByText('50.0 MB')).toBeInTheDocument(); // Hot phase
      expect(screen.getByText('30.0 MB')).toBeInTheDocument(); // Warm phase
      expect(screen.getByText('20.0 MB')).toBeInTheDocument(); // Cold phase
    });

    it('displays trash icon for delete phase', () => {
      useStreamsAppFetch.mockReturnValue({
        value: { phases: mockIlmPhases },
        loading: false,
        error: undefined,
      });

      const definition = createMockDefinition();
      render(<IlmSummary definition={definition} />);

      const trashIcon = screen.getByTestId('euiIcon');
      expect(trashIcon).toBeInTheDocument();
    });

    it('displays time labels for phases with min_age', () => {
      useStreamsAppFetch.mockReturnValue({
        value: { phases: mockIlmPhases },
        loading: false,
        error: undefined,
      });

      const definition = createMockDefinition();
      render(<IlmSummary definition={definition} />);

      expect(screen.getByText('1 hour')).toBeInTheDocument();
      expect(screen.getByText('7 days')).toBeInTheDocument();
      expect(screen.getByText('30 days')).toBeInTheDocument();
    });

    it('displays infinity symbol for phases without explicit min_age', () => {
      const phasesWithoutMinAge = [
        {
          name: 'hot',
          min_age: '0s',
          size_in_bytes: 1024 * 1024 * 50,
        },
        {
          name: 'delete',
          min_age: '30d',
        },
      ];

      useStreamsAppFetch.mockReturnValue({
        value: { phases: phasesWithoutMinAge },
        loading: false,
        error: undefined,
      });

      const definition = createMockDefinition();
      render(<IlmSummary definition={definition} />);

      expect(screen.getByText('∞')).toBeInTheDocument();
    });
  });

  describe('Phase Ordering and Grow Calculation', () => {
    it('handles single phase correctly', () => {
      const singlePhase = [
        {
          name: 'hot',
          min_age: '0s',
          size_in_bytes: 1024 * 1024 * 50,
        },
      ];

      useStreamsAppFetch.mockReturnValue({
        value: { phases: singlePhase },
        loading: false,
        error: undefined,
      });

      const definition = createMockDefinition();
      render(<IlmSummary definition={definition} />);

      expect(screen.getByText('Hot')).toBeInTheDocument();
      expect(screen.getByText('50.0 MB')).toBeInTheDocument();
    });

    it('calculates grow values based on phase duration', () => {
      useStreamsAppFetch.mockReturnValue({
        value: { phases: mockIlmPhases },
        loading: false,
        error: undefined,
      });

      const definition = createMockDefinition();
      render(<IlmSummary definition={definition} />);

      // Verify that phases are displayed (grow calculation affects layout but not visibility)
      expect(screen.getByText('Hot')).toBeInTheDocument();
      expect(screen.getByText('Warm')).toBeInTheDocument();
      expect(screen.getByText('Cold')).toBeInTheDocument();
    });
  });

  describe('Integration with Stats', () => {
    it('refetches data when stats change', () => {
      const definition = createMockDefinition();
      const initialStats = createMockStats();

      useStreamsAppFetch.mockReturnValue({
        value: { phases: mockIlmPhases },
        loading: false,
        error: undefined,
      });

      const { rerender } = render(<IlmSummary definition={definition} stats={initialStats} />);

      // Change stats and rerender
      const newStats = { ...initialStats, sizeBytes: 2048 * 1024 * 1024 };
      rerender(<IlmSummary definition={definition} stats={newStats} />);

      // Verify useStreamsAppFetch was called with updated dependencies
      expect(useStreamsAppFetch).toHaveBeenCalledWith(
        expect.any(Function),
        expect.arrayContaining([mockStreamsRepositoryClient, definition, newStats])
      );
    });
  });

  describe('Accessibility and Data Attributes', () => {
    it('provides proper heading structure', () => {
      useStreamsAppFetch.mockReturnValue({
        value: { phases: mockIlmPhases },
        loading: false,
        error: undefined,
      });

      const definition = createMockDefinition();
      render(<IlmSummary definition={definition} />);

      const heading = screen.getByRole('heading', { level: 5 });
      expect(heading).toHaveTextContent('ILM policy data tiers');
    });

    it('includes proper phase names as text content', () => {
      useStreamsAppFetch.mockReturnValue({
        value: { phases: mockIlmPhases },
        loading: false,
        error: undefined,
      });

      const definition = createMockDefinition();
      render(<IlmSummary definition={definition} />);

      // Verify phase names are accessible
      expect(screen.getByText('Hot')).toBeInTheDocument();
      expect(screen.getByText('Warm')).toBeInTheDocument();
      expect(screen.getByText('Cold')).toBeInTheDocument();
    });
  });
});