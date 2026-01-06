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

jest.mock('../../../../hooks/use_streams_app_fetch');
jest.mock('../../../../hooks/use_kibana');

import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';
import { useKibana } from '../../../../hooks/use_kibana';

const mockUseStreamsAppFetch = useStreamsAppFetch as jest.MockedFunction<typeof useStreamsAppFetch>;
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

describe('IlmSummary', () => {
  const createMockDefinition = (): Streams.ingest.all.GetResponse =>
    ({
      stream: {
        name: 'logs-test',
      },
    } as any);

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

      expect(screen.getByTestId('ilmSummary-title')).toBeInTheDocument();
      expect(screen.getByTestId('ilmSummary-loading')).toBeInTheDocument();
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

      expect(screen.getByTestId('ilmSummary-title')).toBeInTheDocument();
      expect(screen.queryByTestId('ilmPhase-hot-name')).not.toBeInTheDocument();
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

      expect(screen.getByTestId('ilmSummary-title')).toBeInTheDocument();
      expect(screen.getByTestId('ilmPhase-hot-name')).toBeInTheDocument();
      expect(screen.getByTestId('ilmPhase-warm-name')).toBeInTheDocument();
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

      expect(screen.getByTestId('ilmPhase-hot-size')).toHaveTextContent(/1\.0\s?MB/);
      expect(screen.getByTestId('ilmPhase-warm-size')).toHaveTextContent(/500\.0\s?KB/);
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

      expect(screen.getByTestId('ilmSummary-title')).toBeInTheDocument();
      expect(screen.queryByTestId('ilmPhase-hot-name')).not.toBeInTheDocument();
    });
  });
});
