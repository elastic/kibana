/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { of } from 'rxjs';
import { useFieldStatistics } from './use_field_statistics';
import { useKibana } from '../../../../hooks/use_kibana';
import { useTimefilter } from '../../../../hooks/use_timefilter';

jest.mock('../../../../hooks/use_kibana');
jest.mock('../../../../hooks/use_timefilter');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseTimefilter = useTimefilter as jest.MockedFunction<typeof useTimefilter>;

const mockStreamsRepositoryClient = {
  fetch: jest.fn(),
};

const mockFieldStatisticsResponse = {
  isSupported: true,
  fields: [
    {
      name: '@timestamp',
      total_in_bytes: 15000000,
      inverted_index_in_bytes: 0,
      stored_fields_in_bytes: 5000000,
      doc_values_in_bytes: 10000000,
      points_in_bytes: 0,
      norms_in_bytes: 0,
      term_vectors_in_bytes: 0,
      knn_vectors_in_bytes: 0,
    },
    {
      name: 'message',
      total_in_bytes: 8000000,
      inverted_index_in_bytes: 5000000,
      stored_fields_in_bytes: 3000000,
      doc_values_in_bytes: 0,
      points_in_bytes: 0,
      norms_in_bytes: 0,
      term_vectors_in_bytes: 0,
      knn_vectors_in_bytes: 0,
    },
  ],
  totalFields: 2,
};

beforeEach(() => {
  jest.clearAllMocks();

  mockUseKibana.mockReturnValue({
    core: {
      notifications: { toasts: { addError: jest.fn() } },
    },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient: mockStreamsRepositoryClient },
      },
    },
  } as any);

  mockUseTimefilter.mockReturnValue({
    timeState: {},
    timeState$: of({ kind: 'initial' }),
  } as any);

  mockStreamsRepositoryClient.fetch.mockResolvedValue(mockFieldStatisticsResponse);
});

describe('useFieldStatistics', () => {
  describe('successful data fetching', () => {
    it('should fetch field statistics correctly', async () => {
      const { result } = renderHook(() =>
        useFieldStatistics({
          streamName: 'test-stream',
        })
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data).toEqual(mockFieldStatisticsResponse);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeUndefined();
      expect(typeof result.current.refresh).toBe('function');

      expect(mockStreamsRepositoryClient.fetch).toHaveBeenCalledWith(
        'GET /internal/streams/{name}/field_statistics',
        expect.objectContaining({
          params: {
            path: { name: 'test-stream' },
          },
        })
      );
    });

    it('should handle serverless unsupported response', async () => {
      const unsupportedResponse = {
        isSupported: false,
        fields: [],
        totalFields: 0,
      };
      mockStreamsRepositoryClient.fetch.mockResolvedValue(unsupportedResponse);

      const { result } = renderHook(() =>
        useFieldStatistics({
          streamName: 'test-stream',
        })
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data).toEqual(unsupportedResponse);
      expect(result.current.data?.isSupported).toBe(false);
      expect(result.current.data?.fields).toHaveLength(0);
    });

    it('should handle empty fields response', async () => {
      const emptyResponse = {
        isSupported: true,
        fields: [],
        totalFields: 0,
      };
      mockStreamsRepositoryClient.fetch.mockResolvedValue(emptyResponse);

      const { result } = renderHook(() =>
        useFieldStatistics({
          streamName: 'test-stream',
        })
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data?.isSupported).toBe(true);
      expect(result.current.data?.fields).toHaveLength(0);
      expect(result.current.data?.totalFields).toBe(0);
    });
  });

  describe('error scenarios', () => {
    it('should handle fetch errors', async () => {
      const mockError = new Error('Failed to fetch field statistics');
      mockStreamsRepositoryClient.fetch.mockRejectedValue(mockError);

      const { result } = renderHook(() =>
        useFieldStatistics({
          streamName: 'test-stream',
        })
      );

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      expect(result.current.error).toBe(mockError);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('loading states', () => {
    it('should return loading state correctly', async () => {
      const { result } = renderHook(() =>
        useFieldStatistics({
          streamName: 'test-stream',
        })
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('stream name changes', () => {
    it('should refetch when stream name changes', async () => {
      const { result, rerender } = renderHook(
        ({ streamName }: { streamName: string }) =>
          useFieldStatistics({
            streamName,
          }),
        { initialProps: { streamName: 'stream-1' } }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(mockStreamsRepositoryClient.fetch).toHaveBeenCalledWith(
        'GET /internal/streams/{name}/field_statistics',
        expect.objectContaining({
          params: {
            path: { name: 'stream-1' },
          },
        })
      );

      rerender({ streamName: 'stream-2' });

      await waitFor(() => {
        expect(mockStreamsRepositoryClient.fetch).toHaveBeenLastCalledWith(
          'GET /internal/streams/{name}/field_statistics',
          expect.objectContaining({
            params: {
              path: { name: 'stream-2' },
            },
          })
        );
      });
    });
  });
});
