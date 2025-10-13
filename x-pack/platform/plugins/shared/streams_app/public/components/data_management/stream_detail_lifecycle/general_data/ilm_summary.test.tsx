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

jest.mock('../../../../hooks/use_streams_app_fetch');
jest.mock('../../../../hooks/use_kibana');
jest.mock('../hooks/use_ilm_phases_color_and_description');

import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';
import { useKibana } from '../../../../hooks/use_kibana';
import { useIlmPhasesColorAndDescription } from '../hooks/use_ilm_phases_color_and_description';

const mockUseStreamsAppFetch = useStreamsAppFetch as jest.MockedFunction<typeof useStreamsAppFetch>;
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseIlmPhasesColorAndDescription = useIlmPhasesColorAndDescription as jest.MockedFunction<
  typeof useIlmPhasesColorAndDescription
>;

describe('IlmSummary', () => {
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
    it('should render ILM phases', () => {
      const mockPhasesObject = {
        hot: { name: 'hot', min_age: '0ms', size_in_bytes: 1000000 },
        warm: { name: 'warm', min_age: '30d', size_in_bytes: 500000 },
        delete: { name: 'delete', min_age: '60d' },
      };

      mockUseStreamsAppFetch.mockReturnValue({
        value: { phases: mockPhasesObject },
        loading: false,
        error: null,
      } as any);

      const definition = createMockDefinition();
      render(<IlmSummary definition={definition} />);

      expect(screen.getByText('ILM policy data tiers')).toBeInTheDocument();
      expect(screen.getByText('Hot')).toBeInTheDocument();
      expect(screen.getByText('Warm')).toBeInTheDocument();
    });

    it('should display storage sizes', () => {
      const mockPhasesObject = {
        hot: { name: 'hot', min_age: '0ms', size_in_bytes: 1000000 },
        warm: { name: 'warm', min_age: '30d', size_in_bytes: 500000 },
        delete: { name: 'delete', min_age: '60d' },
      };

      mockUseStreamsAppFetch.mockReturnValue({
        value: { phases: mockPhasesObject },
        loading: false,
        error: null,
      } as any);

      const definition = createMockDefinition();
      render(<IlmSummary definition={definition} />);

      expect(screen.getByText(/1\.0\s?MB/)).toBeInTheDocument();
      expect(screen.getByText(/500\.0\s?KB/)).toBeInTheDocument();
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
});
