/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import moment from 'moment';
import type { Streams } from '@kbn/streams-schema';
import { useDataStreamStats } from './use_data_stream_stats';

// Mock the dependencies
jest.mock('../../../../hooks/use_streams_app_fetch');
jest.mock('../../../../hooks/use_kibana');

import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';
import { useKibana } from '../../../../hooks/use_kibana';

const mockUseStreamsAppFetch = useStreamsAppFetch as jest.MockedFunction<typeof useStreamsAppFetch>;
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

// Mock moment to have predictable dates
const mockMoment = moment as jest.Mocked<typeof moment>;
jest.mock('moment', () => {
  const actualMoment = jest.requireActual('moment');
  return {
    ...actualMoment,
    __esModule: true,
    default: jest.fn(() => actualMoment('2024-01-15T10:00:00Z')),
  };
});

describe('useDataStreamStats', () => {
  const mockDataStreamsClient = {
    getDataStreamsStats: jest.fn(),
  };

  const createMockDefinition = (streamName: string = 'logs-test'): Streams.ingest.all.GetResponse => ({
    stream: {
      name: streamName,
    },
  } as any);

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        dataStreamsClient: Promise.resolve(mockDataStreamsClient),
      },
    } as any);

    // Reset moment mock to return fixed date
    (mockMoment as any).mockReturnValue(moment('2024-01-15T10:00:00Z'));
  });

  describe('Successful data fetching', () => {
    it('should fetch and transform data stream stats correctly', async () => {
      const mockStats = {
        sizeBytes: 1000000, // 1MB
        totalDocs: 1000,
        creationDate: '2024-01-10T10:00:00Z', // 5 days ago
      };

      mockDataStreamsClient.getDataStreamsStats.mockResolvedValue({
        dataStreamsStats: [mockStats],
      });

      mockUseStreamsAppFetch.mockImplementation((fetchFn) => {
        // Execute the fetch function to test the logic
        const result = fetchFn();
        return {
          value: result,
          loading: false,
          error: null,
          refresh: jest.fn(),
        } as any;
      });

      const definition = createMockDefinition();
      const { result } = renderHook(() => useDataStreamStats({ definition }));

      // Wait for the fetch function to be called and executed
      await mockDataStreamsClient.getDataStreamsStats();

      expect(mockDataStreamsClient.getDataStreamsStats).toHaveBeenCalledWith({
        datasetQuery: 'logs-test',
        includeCreationDate: true,
      });
    });

    it('should calculate bytesPerDay correctly based on creation date', async () => {
      const creationDate = '2024-01-05T10:00:00Z'; // 10 days ago
      const mockStats = {
        sizeBytes: 2000000, // 2MB
        totalDocs: 2000,
        creationDate,
      };

      let fetchedData: any;

      mockDataStreamsClient.getDataStreamsStats.mockResolvedValue({
        dataStreamsStats: [mockStats],
      });

      mockUseStreamsAppFetch.mockImplementation((fetchFn) => {
        fetchedData = fetchFn();
        return {
          value: fetchedData,
          loading: false,
          error: null,
          refresh: jest.fn(),
        } as any;
      });

      const definition = createMockDefinition();
      renderHook(() => useDataStreamStats({ definition }));

      // Execute the fetch to get the calculated result
      const result = await fetchedData;

      expect(result.bytesPerDay).toBe(200000); // 2MB / 10 days = 200KB per day
    });

    it('should calculate bytesPerDoc correctly', async () => {
      const mockStats = {
        sizeBytes: 5000000, // 5MB
        totalDocs: 5000,
        creationDate: '2024-01-10T10:00:00Z',
      };

      let fetchedData: any;

      mockDataStreamsClient.getDataStreamsStats.mockResolvedValue({
        dataStreamsStats: [mockStats],
      });

      mockUseStreamsAppFetch.mockImplementation((fetchFn) => {
        fetchedData = fetchFn();
        return {
          value: fetchedData,
          loading: false,
          error: null,
          refresh: jest.fn(),
        } as any;
      });

      const definition = createMockDefinition();
      renderHook(() => useDataStreamStats({ definition }));

      const result = await fetchedData;

      expect(result.bytesPerDoc).toBe(1000); // 5MB / 5000 docs = 1000 bytes per doc
    });

    it('should use minimum of 1 day for recent data streams', async () => {
      const creationDate = '2024-01-15T09:00:00Z'; // 1 hour ago (same day)
      const mockStats = {
        sizeBytes: 1000000,
        totalDocs: 1000,
        creationDate,
      };

      let fetchedData: any;

      mockDataStreamsClient.getDataStreamsStats.mockResolvedValue({
        dataStreamsStats: [mockStats],
      });

      mockUseStreamsAppFetch.mockImplementation((fetchFn) => {
        fetchedData = fetchFn();
        return {
          value: fetchedData,
          loading: false,
          error: null,
        } as any;
      });

      const definition = createMockDefinition();
      renderHook(() => useDataStreamStats({ definition }));

      const result = await fetchedData;

      expect(result.bytesPerDay).toBe(1000000); // Should use 1 day as minimum
    });
  });

  describe('Edge cases and error handling', () => {
    it('should return undefined when no stats are returned', async () => {
      mockDataStreamsClient.getDataStreamsStats.mockResolvedValue({
        dataStreamsStats: [],
      });

      let fetchedData: any;

      mockUseStreamsAppFetch.mockImplementation((fetchFn) => {
        fetchedData = fetchFn();
        return {
          value: fetchedData,
          loading: false,
          error: null,
          refresh: jest.fn(),
        } as any;
      });

      const definition = createMockDefinition();
      renderHook(() => useDataStreamStats({ definition }));

      const result = await fetchedData;

      expect(result).toBeUndefined();
    });

    it('should return undefined when stats have no creation date', async () => {
      const mockStats = {
        sizeBytes: 1000000,
        totalDocs: 1000,
        creationDate: undefined,
      };

      mockDataStreamsClient.getDataStreamsStats.mockResolvedValue({
        dataStreamsStats: [mockStats],
      });

      let fetchedData: any;

      mockUseStreamsAppFetch.mockImplementation((fetchFn) => {
        fetchedData = fetchFn();
        return {
          value: fetchedData,
          loading: false,
          error: null,
        } as any;
      });

      const definition = createMockDefinition();
      renderHook(() => useDataStreamStats({ definition }));

      const result = await fetchedData;

      expect(result).toBeUndefined();
    });

    it('should handle zero total docs correctly', async () => {
      const mockStats = {
        sizeBytes: 1000000,
        totalDocs: 0,
        creationDate: '2024-01-10T10:00:00Z',
      };

      let fetchedData: any;

      mockDataStreamsClient.getDataStreamsStats.mockResolvedValue({
        dataStreamsStats: [mockStats],
      });

      mockUseStreamsAppFetch.mockImplementation((fetchFn) => {
        fetchedData = fetchFn();
        return {
          value: fetchedData,
          loading: false,
          error: null,
        } as any;
      });

      const definition = createMockDefinition();
      renderHook(() => useDataStreamStats({ definition }));

      const result = await fetchedData;

      expect(result.bytesPerDay).toBe(0); // Should be 0 when totalDocs is 0
      expect(result.bytesPerDoc).toBe(0); // Should be 0 when totalDocs is 0
    });

    it('should handle undefined sizeBytes', async () => {
      const mockStats = {
        sizeBytes: undefined,
        totalDocs: 1000,
        creationDate: '2024-01-10T10:00:00Z',
      };

      let fetchedData: any;

      mockDataStreamsClient.getDataStreamsStats.mockResolvedValue({
        dataStreamsStats: [mockStats],
      });

      mockUseStreamsAppFetch.mockImplementation((fetchFn) => {
        fetchedData = fetchFn();
        return {
          value: fetchedData,
          loading: false,
          error: null,
        } as any;
      });

      const definition = createMockDefinition();
      renderHook(() => useDataStreamStats({ definition }));

      const result = await fetchedData;

      expect(result.bytesPerDay).toBe(0);
      expect(result.bytesPerDoc).toBe(0);
    });
  });

  describe('Hook return values', () => {
    it('should return loading state correctly', () => {
      mockUseStreamsAppFetch.mockReturnValue({
        value: undefined,
        loading: true,
        error: null,
        refresh: jest.fn(),
      } as any);

      const definition = createMockDefinition();
      const { result } = renderHook(() => useDataStreamStats({ definition }));

      expect(result.current.stats).toBeUndefined();
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.refresh).toBe('function');
    });

    it('should return error state correctly', () => {
      const error = new Error('Fetch failed');
      mockUseStreamsAppFetch.mockReturnValue({
        value: undefined,
        loading: false,
        error,
        refresh: jest.fn(),
      } as any);

      const definition = createMockDefinition();
      const { result } = renderHook(() => useDataStreamStats({ definition }));

      expect(result.current.stats).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(error);
    });

    it('should provide refresh function', () => {
      const mockRefresh = jest.fn();
      mockUseStreamsAppFetch.mockReturnValue({
        value: undefined,
        loading: false,
        error: null,
        refresh: mockRefresh,
      } as any);

      const definition = createMockDefinition();
      const { result } = renderHook(() => useDataStreamStats({ definition }));

      result.current.refresh();
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe('Configuration', () => {
    it('should call useStreamsAppFetch with correct options', () => {
      const definition = createMockDefinition();
      renderHook(() => useDataStreamStats({ definition }));

      expect(mockUseStreamsAppFetch).toHaveBeenCalledWith(
        expect.any(Function),
        expect.arrayContaining([expect.anything(), definition]),
        {
          withTimeRange: false,
          withRefresh: true,
        }
      );
    });
  });
});