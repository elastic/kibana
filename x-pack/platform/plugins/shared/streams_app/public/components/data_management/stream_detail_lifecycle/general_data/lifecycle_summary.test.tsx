/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { LifecycleSummary } from './lifecycle_summary';
import type { Streams } from '@kbn/streams-schema';

// Mock the hooks
jest.mock('../../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    dependencies: {
      start: {
        streams: {
          streamsRepositoryClient: {
            fetch: jest.fn().mockResolvedValue(undefined),
          },
        },
      },
    },
    isServerless: false,
  }),
}));

import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';

jest.mock('../../../../hooks/use_streams_app_fetch', () => ({
  useStreamsAppFetch: jest.fn(() => ({
    value: undefined,
    loading: false,
  })),
}));

const mockUseStreamsAppFetch = useStreamsAppFetch as jest.Mock;

jest.mock('../hooks/use_ilm_phases_color_and_description', () => ({
  useIlmPhasesColorAndDescription: () => ({
    ilmPhases: {
      hot: { color: '#FF0000', hoverColor: '#FF3333', description: 'Hot phase' },
      warm: { color: '#FFA500', hoverColor: '#FFB833', description: 'Warm phase' },
      cold: { color: '#0000FF', hoverColor: '#3333FF', description: 'Cold phase' },
      frozen: { color: '#00FFFF', hoverColor: '#33FFFF', description: 'Frozen phase' },
      delete: { color: '#808080', hoverColor: '#999999', description: 'Delete phase' },
    },
  }),
}));

describe('LifecycleSummary', () => {
  const createDslDefinition = (
    dataRetention?: string,
    downsample?: Array<{ after: string; fixed_interval: string }>
  ) =>
    ({
      stream: { name: 'test-stream' },
      effective_lifecycle: {
        dsl: {
          data_retention: dataRetention,
          downsample,
        },
      },
    } as Streams.ingest.all.GetResponse);

  const createIlmDefinition = () =>
    ({
      stream: { name: 'test-stream' },
      effective_lifecycle: {
        ilm: {
          policy: 'test-policy',
        },
      },
    } as Streams.ingest.all.GetResponse);

  const createDisabledDefinition = () =>
    ({
      stream: { name: 'test-stream' },
      effective_lifecycle: { disabled: {} },
    } as Streams.ingest.all.GetResponse);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DSL Lifecycle', () => {
    it('should render DSL lifecycle with retention period', () => {
      const definition = createDslDefinition('30d');

      render(<LifecycleSummary definition={definition} />);

      expect(screen.getByTestId('dataLifecycleSummary-title')).toBeInTheDocument();
    });

    it('should render DSL lifecycle with infinite retention', () => {
      const definition = createDslDefinition(undefined);

      render(<LifecycleSummary definition={definition} />);

      expect(screen.getByTestId('dataLifecycleTimeline-infinite')).toBeInTheDocument();
    });

    it('should render DSL lifecycle with downsampling', () => {
      const definition = createDslDefinition('60d', [
        { after: '10d', fixed_interval: '1h' },
        { after: '30d', fixed_interval: '1d' },
      ]);

      render(<LifecycleSummary definition={definition} />);

      expect(screen.getByTestId('downsamplingBar-label')).toBeInTheDocument();
    });
    it('should lifecycle summary for disabled lifecycle', () => {
      const definition = createDisabledDefinition();
      render(<LifecycleSummary definition={definition} />);

      expect(screen.getByTestId('dataLifecycleSummary-title')).toBeInTheDocument();
      expect(screen.getByTestId('lifecyclePhase-Hot-name')).toBeInTheDocument();
    });
  });

  describe('ILM Lifecycle', () => {
    it('should render ILM lifecycle', () => {
      const definition = createIlmDefinition();

      render(<LifecycleSummary definition={definition} />);

      expect(screen.getByTestId('dataLifecycleSummary-title')).toBeInTheDocument();
    });

    it('should show loading skeleton while fetching ILM stats', () => {
      mockUseStreamsAppFetch.mockReturnValue({
        value: undefined,
        loading: true,
      });

      const definition = createIlmDefinition();

      render(<LifecycleSummary definition={definition} />);

      expect(screen.getByTestId('dataLifecycleSummary-skeleton')).toBeInTheDocument();
    });
  });
});
