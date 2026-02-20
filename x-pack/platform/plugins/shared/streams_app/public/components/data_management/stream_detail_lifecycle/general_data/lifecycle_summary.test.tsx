/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LifecycleSummary } from './lifecycle_summary';
import type { Streams, IngestStreamLifecycle } from '@kbn/streams-schema';

// Mock the hooks
const mockFetch = jest.fn().mockResolvedValue(undefined);
const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();

jest.mock('../../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    core: {
      notifications: {
        toasts: {
          addSuccess: mockAddSuccess,
          addError: mockAddError,
        },
      },
    },
    dependencies: {
      start: {
        streams: {
          streamsRepositoryClient: {
            fetch: mockFetch,
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
    refresh: jest.fn(),
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
    downsample?: Array<{ after: string; fixed_interval: string }>,
    ingestLifecycle: IngestStreamLifecycle = { inherit: {} }
  ) =>
    ({
      stream: {
        name: 'test-stream',
        ingest: {
          lifecycle: ingestLifecycle,
          processing: { steps: [], updated_at: '2023-10-31' },
        },
      },
      privileges: {
        lifecycle: true,
      },
      effective_lifecycle: {
        dsl: {
          data_retention: dataRetention,
          downsample,
        },
      },
    } as unknown as Streams.ingest.all.GetResponse);

  const createIlmDefinition = () =>
    ({
      stream: { name: 'test-stream' },
      privileges: {
        lifecycle: true,
      },
      effective_lifecycle: {
        ilm: {
          policy: 'test-policy',
        },
      },
    } as unknown as Streams.ingest.all.GetResponse);

  const createDisabledDefinition = () =>
    ({
      stream: { name: 'test-stream' },
      privileges: {
        lifecycle: true,
      },
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
    it('should render lifecycle summary for disabled lifecycle', () => {
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
        refresh: jest.fn(),
      });

      const definition = createIlmDefinition();

      render(<LifecycleSummary definition={definition} />);

      expect(screen.getByTestId('dataLifecycleSummary-skeleton')).toBeInTheDocument();
    });

    it('should open edit policy modal when removing an ILM phase with affected resources', async () => {
      const policies = [
        {
          name: 'test-policy',
          phases: { hot: { min_age: '0d' }, warm: { min_age: '30d' } },
          in_use_by: { data_streams: ['other-stream'], indices: [] },
        },
      ];
      const ilmStatsValue = {
        phases: {
          hot: { name: 'hot', min_age: '0ms', size_in_bytes: 1000, rollover: {} },
          warm: { name: 'warm', min_age: '30d', size_in_bytes: 1000 },
          delete: { name: 'delete', min_age: '60d' },
        },
      };

      mockUseStreamsAppFetch.mockReturnValue({
        value: ilmStatsValue,
        loading: false,
        refresh: jest.fn(),
      });

      mockFetch.mockImplementation((endpoint: string) => {
        if (endpoint === 'GET /internal/streams/lifecycle/_policies') {
          return Promise.resolve(policies);
        }
        return Promise.resolve(undefined);
      });

      const definition = createIlmDefinition();

      render(<LifecycleSummary definition={definition} />);

      await waitFor(() => {
        expect(screen.getByTestId('lifecyclePhase-warm-name')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('lifecyclePhase-warm-button'));

      // Wait for the popover to open and remove button to appear
      await waitFor(() => {
        expect(screen.getByTestId('lifecyclePhase-warm-removeButton')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('lifecyclePhase-warm-removeButton'));

      // Wait for async openDeleteModal -> fetchPolicies -> modal render
      await waitFor(() => {
        expect(screen.getByTestId('editPolicyModalTitle')).toBeInTheDocument();
      });
    });

    it('should save directly when removing an ILM phase with no affected resources', async () => {
      const policies = [
        {
          name: 'test-policy',
          phases: { hot: { min_age: '0d' }, warm: { min_age: '30d' } },
          in_use_by: { data_streams: ['test-stream'], indices: [] },
        },
      ];
      const ilmStatsValue = {
        phases: {
          hot: { name: 'hot', min_age: '0ms', size_in_bytes: 1000, rollover: {} },
          warm: { name: 'warm', min_age: '30d', size_in_bytes: 1000 },
          delete: { name: 'delete', min_age: '60d' },
        },
      };

      mockUseStreamsAppFetch.mockReturnValue({
        value: ilmStatsValue,
        loading: false,
        refresh: jest.fn(),
      });

      mockFetch.mockImplementation((endpoint: string) => {
        if (endpoint === 'GET /internal/streams/lifecycle/_policies') {
          return Promise.resolve(policies);
        }
        return Promise.resolve(undefined);
      });

      const definition = createIlmDefinition();

      render(<LifecycleSummary definition={definition} />);

      await waitFor(() => {
        expect(screen.getByTestId('lifecyclePhase-warm-name')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('lifecyclePhase-warm-button'));

      // Wait for the popover to open and remove button to appear
      await waitFor(() => {
        expect(screen.getByTestId('lifecyclePhase-warm-removeButton')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('lifecyclePhase-warm-removeButton'));

      // Wait for async openDeleteModal -> fetchPolicies -> applyOverwrite -> saveIlmPolicy
      await waitFor(() =>
        expect(mockFetch).toHaveBeenCalledWith(
          'POST /internal/streams/lifecycle/_policy',
          expect.any(Object)
        )
      );

      // Modal should not be shown since there are no affected resources
      expect(screen.queryByTestId('editPolicyModalTitle')).not.toBeInTheDocument();
    });
  });
});
