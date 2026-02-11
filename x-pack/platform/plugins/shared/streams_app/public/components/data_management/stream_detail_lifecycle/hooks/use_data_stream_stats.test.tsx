/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { of } from 'rxjs';
import type { TimeState } from '@kbn/es-query';
import { useDataStreamStats } from './use_data_stream_stats';
import { useKibana } from '../../../../hooks/use_kibana';
import { useTimefilter } from '../../../../hooks/use_timefilter';

jest.mock('../../../../hooks/use_kibana');
jest.mock('../../../../hooks/use_timefilter');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseTimefilter = useTimefilter as jest.MockedFunction<typeof useTimefilter>;

const mockDataStreamsClient = {
  getDataStreamsStats: jest.fn(),
};

const mockFailureStoreStats = {
  stats: { count: 100, size: 50000, creationDate: '2023-01-01T00:00:00Z' },
};

const mockStreamsRepositoryClient = {
  fetch: jest.fn(),
};

const mockDataSearch = {
  search: jest.fn(),
};

const mockDefinition = {
  stream: {
    name: 'test-stream',
  },
  effective_failure_store: {
    lifecycle: {
      enabled: {
        data_retention: '30d',
        is_default_retention: false,
      },
    },
  },
} as any;

const mockDataStreamStats = {
  totalDocs: 500,
  sizeBytes: 2550000,
  creationDate: '2023-01-01T00:00:00Z',
};

const mockTimestate = {
  start: 1760392800000,
  end: 1760479200000,
  timeRange: {
    from: 'now-1d',
    to: 'now',
    mode: 'relative',
  },
  asAbsoluteTimeRange: {
    from: '2025-10-13T22:00:00.000Z',
    to: '2025-10-14T22:00:00.000Z',
    mode: 'absolute',
  },
} as TimeState;

beforeEach(() => {
  jest.clearAllMocks();

  mockUseKibana.mockReturnValue({
    services: {
      dataStreamsClient: Promise.resolve(mockDataStreamsClient),
    },
    core: {
      notifications: { toasts: { addError: jest.fn() } },
      uiSettings: {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'dateFormat') return 'MMM D, YYYY @ HH:mm:ss.SSS';
          if (key === 'histogram:maxBars') return 1000;
          if (key === 'histogram:barTarget') return 50;
          if (key === 'dateFormat:scaled') {
            return [
              ['', 'HH:mm:ss.SSS'],
              ['PT1S', 'HH:mm:ss'],
              ['PT1M', 'HH:mm'],
              ['PT1H', 'YYYY-MM-DD HH:mm'],
              ['P1DT', 'YYYY-MM-DD'],
              ['P1YT', 'YYYY'],
            ];
          }

          throw new Error(`uiSetting [${key}] is not mocked`);
        }),
      },
    },
    dependencies: {
      start: {
        data: { search: mockDataSearch },
        streams: { streamsRepositoryClient: mockStreamsRepositoryClient },
      },
    },
  } as any);

  mockUseTimefilter.mockReturnValue({
    timeState: {},
    timeState$: of({ kind: 'initial' }),
  } as any);

  mockDataStreamsClient.getDataStreamsStats.mockResolvedValue({
    dataStreamsStats: [mockDataStreamStats],
  });

  mockStreamsRepositoryClient.fetch.mockResolvedValue(mockFailureStoreStats);

  mockDataSearch.search.mockReturnValue(
    of({
      rawResponse: {
        aggregations: {
          sampler: { docs_count: { buckets: [{ key: 1, doc_count: 100 }] } },
          interval: '30m',
        },
      },
    })
  );
});

describe('useDataStreamStats', () => {
  describe('successful data fetching', () => {
    it('should fetch data stream stats correctly', async () => {
      const { result } = renderHook(() =>
        useDataStreamStats({
          definition: mockDefinition,
          timeState: mockTimestate,
        })
      );
      await waitFor(() => {
        expect(result.current.stats).toBeDefined();
      });

      expect(result.current.stats).toEqual({
        ds: {
          aggregations: { buckets: [{ key: 1, doc_count: 100 }], interval: '30m' },
          stats: {
            bytesPerDay: 500000,
            bytesPerDoc: 5000,
            creationDate: '2023-01-01T00:00:00Z',
            size: '2.5 MB',
            sizeBytes: 2500000, // mockDataStreamStats.sizeBytes - mockFailureStoreStats.stats.size
            totalDocs: 500,
            perDayDocs: 100,
          },
        },
        fs: {
          aggregations: { buckets: [{ key: 1, doc_count: 100 }], interval: '30m' },
          stats: {
            bytesPerDay: 50000,
            bytesPerDoc: 500,
            creationDate: '2023-01-01T00:00:00Z',
            size: 50000,
            count: 100,
            perDayDocs: 100,
          },
        },
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

      mockStreamsRepositoryClient.fetch.mockResolvedValue({
        ...mockFailureStoreStats,
        stats: { ...mockFailureStoreStats.stats, count: 0, size: 0 },
      });

      mockDataSearch.search.mockReturnValue(
        of({
          rawResponse: {
            aggregations: {
              sampler: { docs_count: { buckets: [] } },
              interval: '30m',
            },
          },
        })
      );

      const { result } = renderHook(() =>
        useDataStreamStats({
          definition: mockDefinition,
          timeState: mockTimestate,
        })
      );

      await waitFor(() => {
        expect(result.current.stats).toBeDefined();
      });
      expect(result.current.stats).toEqual({
        ds: {
          aggregations: { buckets: [], interval: '30m' },
          stats: {
            bytesPerDay: 0,
            bytesPerDoc: 0,
            creationDate: '2023-01-01T00:00:00Z',
            size: '1.0 KB',
            sizeBytes: 1000,
            totalDocs: 0,
            perDayDocs: 0,
          },
        },
        fs: {
          aggregations: { buckets: [], interval: '30m' },
          stats: {
            bytesPerDay: 0,
            bytesPerDoc: 0,
            creationDate: '2023-01-01T00:00:00Z',
            size: 0,
            count: 0,
            perDayDocs: 0,
          },
        },
      });
    });

    it('should handles disabled failure store', async () => {
      mockStreamsRepositoryClient.fetch.mockResolvedValue({
        stats: null,
      });

      const definitionWithDisabledFS = {
        stream: {
          name: 'test-stream',
        },
        effective_failure_store: {
          disabled: {},
        },
      } as any;

      const { result } = renderHook(() =>
        useDataStreamStats({
          definition: definitionWithDisabledFS,
          timeState: mockTimestate,
        })
      );

      await waitFor(() => {
        expect(result.current.stats).toBeDefined();
      });
      expect(result.current.stats).toEqual({
        ds: {
          aggregations: { buckets: [{ key: 1, doc_count: 100 }], interval: '30m' },
          stats: {
            bytesPerDay: 510000,
            bytesPerDoc: 5100,
            creationDate: '2023-01-01T00:00:00Z',
            size: '2.5 MB',
            sizeBytes: 2550000,
            totalDocs: 500,
            perDayDocs: 100,
          },
        },
        fs: {
          aggregations: undefined,
          stats: undefined,
        },
      });
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
          timeState: mockTimestate,
        })
      );

      await waitFor(() => {
        expect(result.current).toBeDefined();
      });
      expect(result.current.stats).toBeUndefined();
    });

    it('should handle missing data stream creation date', async () => {
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
          timeState: mockTimestate,
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
          timeState: mockTimestate,
        })
      );

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });
      expect(result.current.error).toBe(mockError);
    });
  });

  describe('loading states', () => {
    it('should return loading state correctly', async () => {
      const { result } = renderHook(() =>
        useDataStreamStats({
          definition: mockDefinition,
          timeState: mockTimestate,
        })
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.stats).toBeUndefined();
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});
