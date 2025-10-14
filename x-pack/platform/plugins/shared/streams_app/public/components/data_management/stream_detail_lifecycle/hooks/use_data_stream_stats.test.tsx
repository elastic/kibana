/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useDataStreamStats } from './use_data_stream_stats';
import { useKibana } from '../../../../hooks/use_kibana';
import { useTimefilter } from '../../../../hooks/use_timefilter';
import type { TimeState } from '@kbn/es-query';
import { of } from 'rxjs';

jest.mock('../../../../hooks/use_kibana');
jest.mock('../../../../hooks/use_timefilter');
jest.mock('./use_ingestion_rate');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseTimefilter = useTimefilter as jest.MockedFunction<typeof useTimefilter>;

const mockDataStreamsClient = {
  getDataStreamsStats: jest.fn(),
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
    mode: 'absolute',
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

const mockDataStreamStats = {
  totalDocs: 500,
  sizeBytes: 2500000,
  creationDate: '2023-01-01T00:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();

  mockUseKibana.mockReturnValue({
    services: {
      dataStreamsClient: Promise.resolve(mockDataStreamsClient),
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

  mockDataStreamsClient.getDataStreamsStats.mockResolvedValue({
    dataStreamsStats: [mockDataStreamStats],
  });
});

describe('useDataStreamStats', () => {
  describe('successful data fetching', () => {
    it('should fetch and calculate data stream stats correctly', async () => {
      const { result } = renderHook(() =>
        useDataStreamStats({
          definition: mockDefinition,
          timeState: mockTimeState,
          aggregations: mockAggregations,
        })
      );
      await waitFor(() => {
        expect(result.current.stats).toBeDefined();
      });

      // Total doc count from aggregations: 50 + 75 + 25 = 150
      // Range in days: 7 (Jan 1 to Jan 8)
      // Per day docs: 150 / 7 ≈ 21.43
      // Bytes per doc: 2500000 / 500 = 5000
      // Bytes per day: 5000 * 21.43 ≈ 107143
      expect(result.current.stats).toEqual({
        ...mockDataStreamStats,
        bytesPerDoc: 5000,
        bytesPerDay: 107142.85714285713,
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

      const { result } = renderHook(() =>
        useDataStreamStats({
          definition: mockDefinition,
          timeState: mockTimeState,
          aggregations: mockAggregations,
        })
      );

      await waitFor(() => {
        expect(result.current.stats).toBeDefined();
      });
      expect(result.current.stats?.bytesPerDoc).toBe(0);
      expect(result.current.stats?.bytesPerDay).toBe(0);
    });
  });

  describe('error scenarios', () => {
    it('should handle missing data stream stats', async () => {
      mockDataStreamsClient.getDataStreamsStats.mockResolvedValue({
        dataStreamsStats: [],
      });

      const { result } = renderHook(() =>
        useDataStreamStats({
          definition: mockDefinition,
          timeState: mockTimeState,
          aggregations: mockAggregations,
        })
      );

      await waitFor(() => {
        expect(result.current).toBeDefined();
      });
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

      const { result } = renderHook(() =>
        useDataStreamStats({
          definition: mockDefinition,
          timeState: mockTimeState,
          aggregations: mockAggregations,
        })
      );

      await waitFor(() => {
        expect(result.current).toBeDefined();
      });
      expect(result.current.stats).toBeUndefined();
    });

    it('should handle errors', async () => {
      const mockError = new Error('Failed to fetch data stream stats');
      mockDataStreamsClient.getDataStreamsStats.mockRejectedValue(mockError);

      const { result } = renderHook(() =>
        useDataStreamStats({
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
        useDataStreamStats({
          definition: mockDefinition,
          timeState: mockTimeState,
          aggregations: mockAggregations,
        })
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.stats).toBeUndefined();
    });
  });
});
