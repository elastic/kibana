/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { Streams } from '@kbn/streams-schema';
import { LifecycleSummary } from './lifecycle_summary';
import type { DataStreamStats } from '../hooks/use_data_stream_stats';

const mockUseKibana = jest.fn();
const mockUseStreamsAppFetch = jest.fn();

jest.mock('../../../../hooks/use_kibana', () => ({
  useKibana: () => mockUseKibana(),
}));

jest.mock('../../../../hooks/use_streams_app_fetch', () => ({
  useStreamsAppFetch: (...args: unknown[]) => mockUseStreamsAppFetch(...args),
}));

jest.mock('../hooks/use_ilm_phases_color_and_description', () => ({
  useIlmPhasesColorAndDescription: () => ({
    ilmPhases: {
      hot: { color: '#FF0000' },
      warm: { color: '#FFA500' },
      cold: { color: '#0000FF' },
      frozen: { color: '#00FFFF' },
      delete: { color: '#808080' },
    },
  }),
}));

describe('LifecycleSummary', () => {
  const createMockDefinition = (
    lifecycle: 'ilm' | 'dsl',
    dataRetention?: string
  ): Streams.ingest.all.GetResponse =>
    ({
      stream: { name: 'logs-test' },
      effective_lifecycle:
        lifecycle === 'ilm'
          ? { ilm: { policy: 'test-policy' } }
          : { dsl: { data_retention: dataRetention } },
    } as Streams.ingest.all.GetResponse);

  const createMockStats = (sizeBytes: number): DataStreamStats =>
    ({
      name: 'logs-test',
      userPrivileges: {
        canMonitor: true,
        canReadFailureStore: true,
        canManageFailureStore: true,
      },
      sizeBytes,
    } as DataStreamStats);

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
      isServerless: false,
    });
  });

  describe('ILM Lifecycle', () => {
    it('should show skeleton when ILM data is being fetched', () => {
      mockUseStreamsAppFetch.mockReturnValue({
        value: undefined,
        loading: true,
      });

      const definition = createMockDefinition('ilm');
      render(<LifecycleSummary definition={definition} />);

      expect(screen.getByTestId('dataLifecycleSummary-title')).toBeInTheDocument();
      expect(screen.getByTestId('dataLifecycleSummary-skeleton')).toBeInTheDocument();
    });

    it('should render ILM phases with labels and sizes', () => {
      const mockPhasesObject = {
        hot: { name: 'hot', min_age: '0ms', size_in_bytes: 1000000 },
        warm: { name: 'warm', min_age: '30d', size_in_bytes: 500000 },
        delete: { name: 'delete', min_age: '60d' },
      };

      mockUseStreamsAppFetch.mockReturnValue({
        value: { phases: mockPhasesObject },
        loading: false,
      });

      const definition = createMockDefinition('ilm');
      render(<LifecycleSummary definition={definition} />);

      expect(screen.getByTestId('dataLifecycleSummary-title')).toBeInTheDocument();
      expect(screen.getByTestId('lifecyclePhase-hot-name')).toBeInTheDocument();
      expect(screen.getByTestId('lifecyclePhase-warm-name')).toBeInTheDocument();
      expect(screen.getByTestId('dataLifecycle-delete-icon')).toBeInTheDocument();
    });

    it('should display storage sizes for ILM phases', () => {
      const mockPhasesObject = {
        hot: { name: 'hot', min_age: '0ms', size_in_bytes: 1000000 },
        warm: { name: 'warm', min_age: '30d', size_in_bytes: 500000 },
        delete: { name: 'delete', min_age: '60d' },
      };

      mockUseStreamsAppFetch.mockReturnValue({
        value: { phases: mockPhasesObject },
        loading: false,
      });

      const definition = createMockDefinition('ilm');
      render(<LifecycleSummary definition={definition} />);

      expect(screen.getByTestId('lifecyclePhase-hot-size')).toHaveTextContent(/1\.0\s?MB/);
      expect(screen.getByTestId('lifecyclePhase-warm-size')).toHaveTextContent(/500\.0\s?KB/);
    });

    it('should not render phases when ILM data is not available', () => {
      mockUseStreamsAppFetch.mockReturnValue({
        value: undefined,
        loading: false,
      });

      const definition = createMockDefinition('ilm');
      render(<LifecycleSummary definition={definition} />);

      expect(screen.getByTestId('dataLifecycleSummary-title')).toBeInTheDocument();
      expect(screen.queryByTestId('lifecyclePhase-hot-name')).not.toBeInTheDocument();
    });
  });

  describe('DSL Lifecycle', () => {
    beforeEach(() => {
      mockUseKibana.mockReturnValue({
        dependencies: {
          start: {
            streams: {
              streamsRepositoryClient: { fetch: jest.fn() },
            },
          },
        },
        isServerless: false,
      });

      mockUseStreamsAppFetch.mockReturnValue({
        value: undefined,
        loading: false,
      });
    });

    it('should display storage size', () => {
      const definition = createMockDefinition('dsl', '60d');
      const stats = createMockStats(1500000000);

      render(<LifecycleSummary definition={definition} stats={stats} />);

      expect(screen.getByTestId('lifecyclePhase-Hot-size')).toHaveTextContent(/1\.5\s?GB/);
    });

    it('should render delete icon when retention period is set', () => {
      const definition = createMockDefinition('dsl', '60d');
      render(<LifecycleSummary definition={definition} />);

      expect(screen.getByTestId('dataLifecycle-delete-icon')).toBeInTheDocument();
    });

    it('should not render delete icon when retention is infinite', () => {
      const definition = createMockDefinition('dsl', undefined);
      render(<LifecycleSummary definition={definition} />);

      expect(screen.queryByTestId('dataLifecycle-delete-icon')).not.toBeInTheDocument();
    });
    describe('Non-Serverless', () => {
      it('should render "Hot" label', () => {
        const definition = createMockDefinition('dsl', '60d');
        const stats = createMockStats(1500000000);

        render(<LifecycleSummary definition={definition} stats={stats} />);
      });
    });

    describe('Serverless', () => {
      beforeEach(() => {
        mockUseKibana.mockReturnValue({
          dependencies: {
            start: {
              streams: {
                streamsRepositoryClient: { fetch: jest.fn() },
              },
            },
          },
          isServerless: true,
        });

        mockUseStreamsAppFetch.mockReturnValue({
          value: undefined,
          loading: false,
        });
      });

      it('should render "Successful ingest" label', () => {
        const definition = createMockDefinition('dsl', '30d');
        const stats = createMockStats(2000000000);

        render(<LifecycleSummary definition={definition} stats={stats} />);

        expect(screen.getByTestId('lifecyclePhase-Successful ingest-name')).toBeInTheDocument();
      });
    });
  });
});
