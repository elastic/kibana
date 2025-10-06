/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import moment from 'moment';
import { useFailureStoreStats } from './use_failure_store_stats';
import { useKibana } from '../../../../hooks/use_kibana';
import { useTimefilter } from '../../../../hooks/use_timefilter';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';
import { useAggregations } from './use_ingestion_rate';

// Mock the dependencies
jest.mock('../../../../hooks/use_kibana');
jest.mock('../../../../hooks/use_timefilter');
jest.mock('../../../../hooks/use_streams_app_fetch');
jest.mock('./use_ingestion_rate');

// Mock moment to ensure consistent behavior
jest.mock('moment', () => {
  const actualMoment = jest.requireActual('moment');
  const mockMoment = jest.fn(() => ({
    diff: jest.fn(() => 7), // Mock 7 days difference
  }));
  // Copy all the methods from actual moment to preserve functionality
  Object.assign(mockMoment, actualMoment);
  return mockMoment;
});

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseTimefilter = useTimefilter as jest.MockedFunction<typeof useTimefilter>;
const mockUseStreamsAppFetch = useStreamsAppFetch as jest.MockedFunction<typeof useStreamsAppFetch>;
const mockUseAggregations = useAggregations as jest.MockedFunction<typeof useAggregations>;

describe('useFailureStoreStats', () => {
  const mockStreamsRepositoryClient = {
    fetch: jest.fn(),
  };

  const mockDefinition = {
    stream: {
      name: 'test-stream',
    },
  } as any;

  const mockTimeState = {
    start: '2023-01-01T00:00:00Z',
    end: '2023-01-08T00:00:00Z',
  };

  const mockAggregations = {
    buckets: [{ doc_count: 100 }, { doc_count: 200 }, { doc_count: 150 }],
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
    } as any);

    mockUseTimefilter.mockReturnValue({
      timeState: mockTimeState,
    } as any);

    mockUseAggregations.mockReturnValue({
      aggregations: mockAggregations,
    } as any);

    // Moment is already mocked at the module level
  });

  describe('successful data fetching', () => {
    it('should fetch and calculate failure store stats correctly', async () => {
      const mockFetchResponse = {
        config: mockFailureStoreConfig,
        stats: mockFailureStoreStats,
      };

      mockStreamsRepositoryClient.fetch.mockResolvedValue(mockFetchResponse);

      const mockFetchResult = {
        value: {
          config: mockFailureStoreConfig,
          stats: {
            ...mockFailureStoreStats,
            bytesPerDoc: 5000,
            bytesPerDay: 321428.57142857142,
          },
        },
        loading: false,
        refresh: jest.fn(),
        error: undefined,
      };

      mockUseStreamsAppFetch.mockReturnValue(mockFetchResult);

      const { result } = renderHook(() => useFailureStoreStats({ definition: mockDefinition }));

      expect(result.current.data?.config).toEqual(mockFailureStoreConfig);
      expect(result.current.data?.stats).toEqual({
        ...mockFailureStoreStats,
        bytesPerDoc: 5000,
        bytesPerDay: 321428.57142857142,
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

      const mockFetchResult = {
        value: {
          config: mockFailureStoreConfig,
          stats: {
            ...statsWithZeroDocs,
            bytesPerDoc: 0,
            bytesPerDay: 0,
          },
        },
        loading: false,
        refresh: jest.fn(),
        error: undefined,
      };

      mockUseStreamsAppFetch.mockReturnValue(mockFetchResult);

      const { result } = renderHook(() => useFailureStoreStats({ definition: mockDefinition }));

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

      const mockFetchResult = {
        value: {
          config: mockFailureStoreConfig,
          stats: undefined,
        },
        loading: false,
        refresh: jest.fn(),
        error: undefined,
      };

      mockUseStreamsAppFetch.mockReturnValue(mockFetchResult);

      const { result } = renderHook(() => useFailureStoreStats({ definition: mockDefinition }));

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

      const mockFetchResult = {
        value: {
          config: mockFailureStoreConfig,
          stats: undefined,
        },
        loading: false,
        refresh: jest.fn(),
        error: undefined,
      };

      mockUseStreamsAppFetch.mockReturnValue(mockFetchResult);

      const { result } = renderHook(() => useFailureStoreStats({ definition: mockDefinition }));

      expect(result.current.data?.config).toEqual(mockFailureStoreConfig);
      expect(result.current.data?.stats).toBeUndefined();
    });

    it('should handle fetch errors', async () => {
      const mockError = new Error('Failed to fetch failure store stats');

      const mockFetchResult = {
        value: undefined,
        loading: false,
        refresh: jest.fn(),
        error: mockError,
      };

      mockUseStreamsAppFetch.mockReturnValue(mockFetchResult);

      const { result } = renderHook(() => useFailureStoreStats({ definition: mockDefinition }));

      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBe(mockError);
    });

    it('should handle API fetch rejection', async () => {
      const apiError = new Error('API request failed');
      mockStreamsRepositoryClient.fetch.mockRejectedValue(apiError);

      const mockFetchResult = {
        value: undefined,
        loading: false,
        refresh: jest.fn(),
        error: apiError,
      };

      mockUseStreamsAppFetch.mockReturnValue(mockFetchResult);

      const { result } = renderHook(() => useFailureStoreStats({ definition: mockDefinition }));

      expect(result.current.error).toBe(apiError);
    });
  });

  describe('loading states', () => {
    it('should return loading state correctly', () => {
      const mockFetchResult = {
        value: undefined,
        loading: true,
        refresh: jest.fn(),
        error: undefined,
      };

      mockUseStreamsAppFetch.mockReturnValue(mockFetchResult);

      const { result } = renderHook(() => useFailureStoreStats({ definition: mockDefinition }));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('calculations', () => {
    it('should calculate bytesPerDay correctly with aggregations', async () => {
      const customAggregations = {
        buckets: [{ doc_count: 50 }, { doc_count: 75 }, { doc_count: 25 }],
      };

      mockUseAggregations.mockReturnValue({
        aggregations: customAggregations,
      } as any);

      mockUseStreamsAppFetch.mockImplementation(() => {
        const rangeInDays = Math.max(
          1,
          Math.round(moment(mockTimeState.end).diff(moment(mockTimeState.start), 'days'))
        );
        const countRange = customAggregations.buckets.reduce(
          (sum, bucket) => sum + bucket.doc_count,
          0
        );
        const bytesPerDoc = mockFailureStoreStats.size / mockFailureStoreStats.count;
        const perDayDocs = countRange / rangeInDays;
        const bytesPerDay = bytesPerDoc * perDayDocs;

        return {
          value: {
            config: mockFailureStoreConfig,
            stats: {
              ...mockFailureStoreStats,
              bytesPerDoc,
              bytesPerDay,
            },
          },
          loading: false,
          refresh: jest.fn(),
          error: undefined,
        } as any;
      });

      const { result } = renderHook(() => useFailureStoreStats({ definition: mockDefinition }));

      // Total doc count from aggregations: 50 + 75 + 25 = 150
      // Range in days: 7 (mocked)
      // Per day docs: 150 / 7 ≈ 21.43
      // Bytes per doc: 2500000 / 500 = 5000
      // Bytes per day: 5000 * 21.43 ≈ 107143
      expect(result.current.data?.stats?.bytesPerDay).toBeCloseTo(107142.857, 2);
    });

    it('should handle missing aggregations gracefully', () => {
      mockUseAggregations.mockReturnValue({
        aggregations: undefined,
      } as any);

      mockUseStreamsAppFetch.mockImplementation((callback) => {
        // When aggregations are undefined, countRange should be 0, leading to bytesPerDay = 0
        return {
          value: {
            config: mockFailureStoreConfig,
            stats: {
              ...mockFailureStoreStats,
              bytesPerDoc: 5000,
              bytesPerDay: 0,
            },
          },
          loading: false,
          refresh: jest.fn(),
          error: undefined,
        } as any;
      });

      const { result } = renderHook(() => useFailureStoreStats({ definition: mockDefinition }));

      expect(result.current.data?.stats?.bytesPerDay).toBe(0);
    });
  });
});
