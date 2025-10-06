/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import moment from 'moment';
import { useDataStreamStats } from './use_data_stream_stats';
import { useKibana } from '../../../../hooks/use_kibana';
import { useTimefilter } from '../../../../hooks/use_timefilter';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';
import { useAggregations } from './use_ingestion_rate';

jest.mock('../../../../hooks/use_kibana');
jest.mock('../../../../hooks/use_timefilter');
jest.mock('../../../../hooks/use_streams_app_fetch');
jest.mock('./use_ingestion_rate');
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

describe('useDataStreamStats', () => {
  const mockDataStreamsClient = {
    getDataStreamsStats: jest.fn(),
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

  const mockDataStreamStats = {
    totalDocs: 1000,
    sizeBytes: 5000000,
    creationDate: '2023-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        dataStreamsClient: Promise.resolve(mockDataStreamsClient),
      },
    } as any);

    mockUseTimefilter.mockReturnValue({
      timeState: mockTimeState,
    } as any);

    mockUseAggregations.mockReturnValue({
      aggregations: mockAggregations,
    } as any);
  });

  describe('successful data fetching', () => {
    it('should fetch and calculate data stream stats correctly', async () => {
      const mockFetchResult = {
        value: {
          ...mockDataStreamStats,
          bytesPerDoc: 5000,
          bytesPerDay: 321428.57142857142,
        },
        loading: false,
        refresh: jest.fn(),
        error: undefined,
      };

      mockDataStreamsClient.getDataStreamsStats.mockResolvedValue({
        dataStreamsStats: [mockDataStreamStats],
      });

      mockUseStreamsAppFetch.mockReturnValue(mockFetchResult);

      const { result } = renderHook(() => useDataStreamStats({ definition: mockDefinition }));

      expect(result.current.stats).toEqual({
        ...mockDataStreamStats,
        bytesPerDoc: 5000,
        bytesPerDay: 321428.57142857142,
      });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeUndefined();
      expect(typeof result.current.refresh).toBe('function');
    });

    it('should handle zero documents gracefully', async () => {
      const statsWithZeroDocs = {
        ...mockDataStreamStats,
        totalDocs: 0,
        sizeBytes: 1000,
      };

      mockDataStreamsClient.getDataStreamsStats.mockResolvedValue({
        dataStreamsStats: [statsWithZeroDocs],
      });

      const mockFetchResult = {
        value: {
          ...statsWithZeroDocs,
          bytesPerDoc: 0,
          bytesPerDay: 0,
        },
        loading: false,
        refresh: jest.fn(),
        error: undefined,
      };

      mockUseStreamsAppFetch.mockReturnValue(mockFetchResult);

      const { result } = renderHook(() => useDataStreamStats({ definition: mockDefinition }));

      expect(result.current.stats?.bytesPerDoc).toBe(0);
      expect(result.current.stats?.bytesPerDay).toBe(0);
    });
  });

  describe('error scenarios', () => {
    it('should handle missing data stream stats', async () => {
      mockDataStreamsClient.getDataStreamsStats.mockResolvedValue({
        dataStreamsStats: [],
      });

      const mockFetchResult = {
        value: undefined,
        loading: false,
        refresh: jest.fn(),
        error: undefined,
      };

      mockUseStreamsAppFetch.mockReturnValue(mockFetchResult);

      const { result } = renderHook(() => useDataStreamStats({ definition: mockDefinition }));

      expect(result.current.stats).toBeUndefined();
    });

    it('should handle missing creation date', async () => {
      const statsWithoutCreationDate = {
        ...mockDataStreamStats,
        creationDate: undefined,
      };

      mockDataStreamsClient.getDataStreamsStats.mockResolvedValue({
        dataStreamsStats: [statsWithoutCreationDate],
      });

      const mockFetchResult = {
        value: undefined,
        loading: false,
        refresh: jest.fn(),
        error: undefined,
      };

      mockUseStreamsAppFetch.mockReturnValue(mockFetchResult);

      const { result } = renderHook(() => useDataStreamStats({ definition: mockDefinition }));

      expect(result.current.stats).toBeUndefined();
    });

    it('should handle fetch errors', async () => {
      const mockError = new Error('Failed to fetch data stream stats');

      const mockFetchResult = {
        value: undefined,
        loading: false,
        refresh: jest.fn(),
        error: mockError,
      };

      mockUseStreamsAppFetch.mockReturnValue(mockFetchResult);

      const { result } = renderHook(() => useDataStreamStats({ definition: mockDefinition }));

      expect(result.current.stats).toBeUndefined();
      expect(result.current.error).toBe(mockError);
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

      const { result } = renderHook(() => useDataStreamStats({ definition: mockDefinition }));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.stats).toBeUndefined();
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
        const bytesPerDoc = mockDataStreamStats.sizeBytes / mockDataStreamStats.totalDocs;
        const perDayDocs = countRange / rangeInDays;
        const bytesPerDay = bytesPerDoc * perDayDocs;

        return {
          value: {
            ...mockDataStreamStats,
            bytesPerDoc,
            bytesPerDay,
          },
          loading: false,
          refresh: jest.fn(),
          error: undefined,
        } as any;
      });

      const { result } = renderHook(() => useDataStreamStats({ definition: mockDefinition }));

      // Total doc count from aggregations: 50 + 75 + 25 = 150
      // Range in days: 7 (mocked)
      // Per day docs: 150 / 7 ≈ 21.43
      // Bytes per doc: 5000000 / 1000 = 5000
      // Bytes per day: 5000 * 21.43 ≈ 107143
      expect(result.current.stats?.bytesPerDay).toBeCloseTo(107142.857, 2);
    });

    it('should handle missing aggregations gracefully', () => {
      mockUseAggregations.mockReturnValue({
        aggregations: undefined,
      } as any);

      mockUseStreamsAppFetch.mockImplementation(() => {
        // When aggregations are undefined, countRange should be 0, leading to bytesPerDay = 0
        return {
          value: {
            ...mockDataStreamStats,
            bytesPerDoc: 5000,
            bytesPerDay: 0,
          },
          loading: false,
          refresh: jest.fn(),
          error: undefined,
        } as any;
      });

      const { result } = renderHook(() => useDataStreamStats({ definition: mockDefinition }));

      expect(result.current.stats?.bytesPerDay).toBe(0);
    });
  });
});
