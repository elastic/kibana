/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useFailureStoreStats } from './use_failure_store_stats';
import { useKibana } from '../../../../hooks/use_kibana';
import { useTimefilter } from '../../../../hooks/use_timefilter';
import type { TimeState } from '@kbn/es-query';
import { of } from 'rxjs';

jest.mock('../../../../hooks/use_kibana');
jest.mock('../../../../hooks/use_timefilter');
jest.mock('./use_ingestion_rate');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseTimefilter = useTimefilter as jest.MockedFunction<typeof useTimefilter>;

describe('useFailureStoreStats', () => {
  const mockStreamsRepositoryClient = {
    fetch: jest.fn(),
  };

  const mockDefinition = {
    stream: {
      name: 'test-stream',
    },
  } as any;

  const mockTimeState: TimeState = {
    timeRange: {
      from: '2023-01-01T00:00:00Z',
      to: '2023-01-08T00:00:00Z',
    },
    asAbsoluteTimeRange: {
      from: '2023-01-01T00:00:00Z',
      to: '2023-01-08T00:00:00Z',
      mode: 'absolute',
    },
    start: new Date('2023-01-01T00:00:00Z').getTime(),
    end: new Date('2023-01-08T00:00:00Z').getTime(),
  };

  const mockAggregations = {
    buckets: [
      { key: 1, doc_count: 50 },
      { key: 2, doc_count: 75 },
      { key: 3, doc_count: 25 },
    ],
    interval: '1d',
  };

  const mockFailureStoreConfig = {
    enabled: true,
    template: 'test-template',
  };

  const mockFailureStoreStats = {
    count: 500,
    size: 2500000,
    creationDate: '2023-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      dependencies: {
        start: {
          streams: {
            streamsRepositoryClient: mockStreamsRepositoryClient,
          },
        },
      },
      core: {
        notifications: {
          toasts: {
            addError: jest.fn(),
          },
        },
      },
    } as any);

    mockUseTimefilter.mockReturnValue({
      timeState: mockTimeState,
      timeState$: of({ kind: 'initial' }),
    } as any);

    const mockFetchResponse = {
      config: mockFailureStoreConfig,
      stats: mockFailureStoreStats,
    };

    mockStreamsRepositoryClient.fetch.mockResolvedValue(mockFetchResponse);
  });

  describe('successful data fetching', () => {
    it('should fetch and calculate failure store stats correctly', async () => {
      const mockFetchResponse = {
        config: mockFailureStoreConfig,
        stats: mockFailureStoreStats,
      };

      mockStreamsRepositoryClient.fetch.mockResolvedValue(mockFetchResponse);

      const { result } = renderHook(() =>
        useFailureStoreStats({
          definition: mockDefinition,
          timeState: mockTimeState,
          aggregations: mockAggregations,
        })
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });
      expect(result.current.data?.config).toEqual(mockFailureStoreConfig);

      // Total doc count from aggregations: 50 + 75 + 25 = 150
      // Range in days: 7 (Jan 1 to Jan 8)
      // Per day docs: 150 / 7 ≈ 21.43
      // Bytes per doc: 2500000 / 500 = 5000
      // Bytes per day: 5000 * 21.43 ≈ 107143
      expect(result.current.data?.stats).toEqual({
        ...mockFailureStoreStats,
        bytesPerDoc: 5000,
        bytesPerDay: 107142.85714285713,
      });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeUndefined();
      expect(typeof result.current.refresh).toBe('function');
    });

    it('should handle zero documents gracefully', async () => {
      const statsWithZeroDocs = {
        ...mockFailureStoreStats,
        count: 0,
        size: 1000,
      };

      mockStreamsRepositoryClient.fetch.mockResolvedValue({
        config: mockFailureStoreConfig,
        stats: statsWithZeroDocs,
      });

      const { result } = renderHook(() =>
        useFailureStoreStats({
          definition: mockDefinition,
          timeState: mockTimeState,
          aggregations: mockAggregations,
        })
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });
      expect(result.current.data?.stats?.bytesPerDoc).toBe(0);
      expect(result.current.data?.stats?.bytesPerDay).toBe(0);
    });
  });

  describe('error scenarios', () => {
    it('should handle missing failure store stats', async () => {
      mockStreamsRepositoryClient.fetch.mockResolvedValue({
        config: mockFailureStoreConfig,
        stats: null,
      });

      const { result } = renderHook(() =>
        useFailureStoreStats({
          definition: mockDefinition,
          timeState: mockTimeState,
          aggregations: mockAggregations,
        })
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });
      expect(result.current.data?.config).toEqual(mockFailureStoreConfig);
      expect(result.current.data?.stats).toBeUndefined();
    });

    it('should handle missing creation date', async () => {
      const statsWithoutCreationDate = {
        ...mockFailureStoreStats,
        creationDate: undefined,
      };

      mockStreamsRepositoryClient.fetch.mockResolvedValue({
        config: mockFailureStoreConfig,
        stats: statsWithoutCreationDate,
      });

      const { result } = renderHook(() =>
        useFailureStoreStats({
          definition: mockDefinition,
          timeState: mockTimeState,
          aggregations: mockAggregations,
        })
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });
      expect(result.current.data?.config).toEqual(mockFailureStoreConfig);
      expect(result.current.data?.stats).toBeUndefined();
    });

    it('should handle error', async () => {
      const mockError = new Error('Failed to fetch failure store stats');
      mockStreamsRepositoryClient.fetch.mockRejectedValue(mockError);

      const { result } = renderHook(() =>
        useFailureStoreStats({
          definition: mockDefinition,
          timeState: mockTimeState,
          aggregations: mockAggregations,
        })
      );

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });
      expect(result.current.error).toBe(mockError);
    });
  });

  describe('loading states', () => {
    it('should return loading state correctly', () => {
      const { result } = renderHook(() =>
        useFailureStoreStats({
          definition: mockDefinition,
          timeState: mockTimeState,
          aggregations: mockAggregations,
        })
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });
  });
});
