/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useAllResults } from './use_all_results';
import { useKibana } from '../common/lib/kibana';
import { Direction } from '../../common/search_strategy';

jest.mock('../common/lib/kibana');
jest.mock('../common/hooks/use_error_toast', () => ({
  useErrorToast: () => jest.fn(),
}));
jest.mock('@kbn/react-query', () => ({
  useQuery: jest.fn(),
}));

const mockUseKibana = jest.mocked(useKibana);

describe('useAllResults', () => {
  let mockHttp: { get: jest.Mock; post: jest.Mock };
  let mockUseQuery: jest.Mock;

  const defaultHookParams = {
    actionId: 'action-123',
    liveQueryActionId: 'lq-123',
    activePage: 0,
    limit: 50,
    sort: [{ field: '@timestamp', direction: Direction.desc }],
    kuery: '',
    isLive: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockHttp = {
      get: jest.fn(),
      post: jest.fn(),
    };

    mockUseKibana.mockReturnValue({
      services: {
        http: mockHttp,
      },
    });

    mockUseQuery = jest.requireMock('@kbn/react-query').useQuery;

    // Default mock for useQuery - called with (queryKey, queryFn, options)
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      isPreviousData: false,
    });
  });

  describe('hook initialization', () => {
    it('should call useQuery with correct query key containing actionId', () => {
      renderHook(() => useAllResults(defaultHookParams));

      expect(mockUseQuery).toHaveBeenCalled();
      // useQuery is called with (queryKey, queryFn, options)
      const queryKey = mockUseQuery.mock.calls[0][0];

      // Query key is ['allActionResults', { actionId, ... }]
      expect(queryKey[0]).toBe('allActionResults');
      expect(queryKey[1]).toMatchObject({
        actionId: 'action-123',
      });
    });

    it('should include pagination params in query key', () => {
      renderHook(() =>
        useAllResults({
          ...defaultHookParams,
          activePage: 5,
          limit: 25,
        })
      );

      expect(mockUseQuery).toHaveBeenCalled();
      const queryKey = mockUseQuery.mock.calls[0][0];

      expect(queryKey[1]).toMatchObject({
        activePage: 5,
        limit: 25,
      });
    });

    it('should include sort in query key', () => {
      const sort = [{ field: 'agent.name', direction: Direction.asc }];

      renderHook(() =>
        useAllResults({
          ...defaultHookParams,
          sort,
        })
      );

      expect(mockUseQuery).toHaveBeenCalled();
      const queryKey = mockUseQuery.mock.calls[0][0];

      expect(queryKey[1].sort).toEqual(sort);
    });

    it('should include kuery in query key when provided', () => {
      renderHook(() =>
        useAllResults({
          ...defaultHookParams,
          kuery: 'osquery.action: "test"',
        })
      );

      expect(mockUseQuery).toHaveBeenCalled();
      const queryKey = mockUseQuery.mock.calls[0][0];

      expect(queryKey[1].kuery).toBe('osquery.action: "test"');
    });
  });

  describe('query function', () => {
    it('should construct correct API URL', async () => {
      mockHttp.get.mockResolvedValue({
        data: { edges: [], total: 0 },
      });

      renderHook(() => useAllResults(defaultHookParams));

      expect(mockUseQuery).toHaveBeenCalled();
      // Second argument is the queryFn
      const queryFn = mockUseQuery.mock.calls[0][1];

      // Execute the query function
      await queryFn();

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/api/osquery/live_queries/lq-123/results/action-123',
        expect.any(Object)
      );
    });

    it('should include version in API request', async () => {
      mockHttp.get.mockResolvedValue({
        data: { edges: [], total: 0 },
      });

      renderHook(() => useAllResults(defaultHookParams));

      const queryFn = mockUseQuery.mock.calls[0][1];
      await queryFn();

      expect(mockHttp.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          version: '2023-10-31',
        })
      );
    });

    it('should include query parameters in API request', async () => {
      mockHttp.get.mockResolvedValue({
        data: { edges: [], total: 0 },
      });

      const sort = [{ field: 'agent.id', direction: Direction.asc }];
      const hookParams = {
        ...defaultHookParams,
        activePage: 3,
        limit: 100,
        sort,
        kuery: 'test:query',
        startDate: '2024-01-01T00:00:00.000Z',
      };

      renderHook(() => useAllResults(hookParams));

      const queryFn = mockUseQuery.mock.calls[0][1];
      await queryFn();

      expect(mockHttp.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          query: expect.objectContaining({
            page: 3,
            pageSize: 100,
            sort: 'agent.id',
            sortOrder: 'asc',
            kuery: 'test:query',
            startDate: '2024-01-01T00:00:00.000Z',
          }),
        })
      );
    });
  });

  describe('response transformation', () => {
    it('should return transformed data with edges and columns', () => {
      const mockEdges = [
        { _id: '1', fields: { 'agent.id': ['agent-1'], '@timestamp': ['2024-01-01'] } },
      ];

      mockUseQuery.mockReturnValue({
        data: {
          id: 'action-123',
          edges: mockEdges,
          total: 1,
          columns: ['@timestamp', 'agent.id'],
        },
        isLoading: false,
        isFetching: false,
        isError: false,
        error: null,
        isPreviousData: false,
      });

      const { result } = renderHook(() => useAllResults(defaultHookParams));

      expect(result.current.data).toEqual({
        id: 'action-123',
        edges: mockEdges,
        total: 1,
        columns: ['@timestamp', 'agent.id'],
      });
    });

    it('should include PIT data when available', () => {
      mockUseQuery.mockReturnValue({
        data: {
          id: 'action-123',
          edges: [],
          total: 20000,
          columns: [],
          pitId: 'pit-123',
          searchAfter: JSON.stringify([1733900000000, 100]),
          hasMore: true,
        },
        isLoading: false,
        isFetching: false,
        isError: false,
        error: null,
        isPreviousData: false,
      });

      const { result } = renderHook(() => useAllResults(defaultHookParams));

      expect(result.current.data?.pitId).toBe('pit-123');
      expect(result.current.data?.searchAfter).toBe(JSON.stringify([1733900000000, 100]));
      expect(result.current.data?.hasMore).toBe(true);
    });
  });

  describe('loading states', () => {
    it('should report isLoading from useQuery', () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
        isError: false,
        error: null,
        isPreviousData: false,
      });

      const { result } = renderHook(() => useAllResults(defaultHookParams));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isFetching).toBe(true);
    });

    it('should report isFetching when refetching', () => {
      mockUseQuery.mockReturnValue({
        data: { edges: [], total: 0, columns: [] },
        isLoading: false,
        isFetching: true,
        isError: false,
        error: null,
        isPreviousData: false,
      });

      const { result } = renderHook(() => useAllResults(defaultHookParams));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(true);
    });
  });

  describe('refetch interval', () => {
    it('should set refetch interval when isLive is true', () => {
      renderHook(() =>
        useAllResults({
          ...defaultHookParams,
          isLive: true,
        })
      );

      expect(mockUseQuery).toHaveBeenCalled();
      // Third argument is the options
      const options = mockUseQuery.mock.calls[0][2];

      expect(options.refetchInterval).toBe(5000);
    });

    it('should not refetch when isLive is false', () => {
      renderHook(() =>
        useAllResults({
          ...defaultHookParams,
          isLive: false,
        })
      );

      expect(mockUseQuery).toHaveBeenCalled();
      const options = mockUseQuery.mock.calls[0][2];

      expect(options.refetchInterval).toBe(false);
    });
  });

  describe('select transformation', () => {
    it('should have select function in options', () => {
      renderHook(() => useAllResults(defaultHookParams));

      expect(mockUseQuery).toHaveBeenCalled();
      const options = mockUseQuery.mock.calls[0][2];

      expect(options.select).toBeDefined();
      expect(typeof options.select).toBe('function');
    });

    it('select function should transform response correctly', () => {
      renderHook(() => useAllResults(defaultHookParams));

      const options = mockUseQuery.mock.calls[0][2];
      const mockResponse = {
        data: {
          total: 100,
          edges: [{ _id: '1', fields: { 'agent.id': ['a1'], 'host.name': ['h1'] } }],
          pitId: 'pit-123',
          searchAfter: '[1, 2]',
          hasMore: true,
        },
      };

      const result = options.select(mockResponse);

      expect(result).toEqual({
        id: 'action-123',
        total: 100,
        edges: mockResponse.data.edges,
        columns: ['agent.id', 'host.name'],
        pitId: 'pit-123',
        searchAfter: '[1, 2]',
        hasMore: true,
      });
    });
  });
});
