/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClientProvider, QueryClient } from '@kbn/react-query';
import { useKibana } from '../common/lib/kibana';
import { useSavedQueries } from './use_saved_queries';

jest.mock('../common/lib/kibana');
jest.mock('../common/hooks/use_error_toast', () => ({
  useErrorToast: () => jest.fn(),
}));

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  return Wrapper;
};

const MOCK_RESPONSE = {
  total: 2,
  perPage: 10,
  page: 1,
  data: [
    {
      saved_object_id: 'sq-1',
      id: 'my-query',
      description: 'A test query',
      query: 'SELECT 1',
      created_by: 'admin',
      created_by_profile_uid: 'uid-1',
      updated_at: '2026-01-01T00:00:00Z',
      updated_by: 'admin',
    },
    {
      saved_object_id: 'sq-2',
      id: 'another-query',
      description: 'Another query',
      query: 'SELECT 2',
      created_by: 'user1',
      updated_at: '2026-01-02T00:00:00Z',
      updated_by: 'user1',
    },
  ],
};

describe('useSavedQueries', () => {
  let mockHttp: { get: jest.Mock };
  let mockToasts: { addSuccess: jest.Mock; addError: jest.Mock; remove: jest.Mock };
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHttp = { get: jest.fn().mockResolvedValue(MOCK_RESPONSE) };
    mockToasts = { addSuccess: jest.fn(), addError: jest.fn(), remove: jest.fn() };
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
      logger: { log: () => null, warn: () => null, error: () => null },
    });

    useKibanaMock.mockReturnValue({
      services: {
        http: mockHttp,
        notifications: { toasts: mockToasts },
      },
    } as unknown as ReturnType<typeof useKibana>);
  });

  it('fetches saved queries with default parameters', async () => {
    const { result } = renderHook(() => useSavedQueries({ isLive: false }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockHttp.get).toHaveBeenCalledWith('/api/osquery/saved_queries', {
      version: '2023-10-31',
      query: {
        page: 1,
        pageSize: 10000,
        sort: 'updated_at',
        sortOrder: 'desc',
      },
    });

    expect(result.current.data).toEqual(MOCK_RESPONSE);
  });

  it('passes search parameter when provided', async () => {
    const { result } = renderHook(() => useSavedQueries({ isLive: false, search: 'my-query' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockHttp.get).toHaveBeenCalledWith('/api/osquery/saved_queries', {
      version: '2023-10-31',
      query: expect.objectContaining({ search: 'my-query' }),
    });
  });

  it('passes createdBy parameter when provided', async () => {
    const { result } = renderHook(
      () => useSavedQueries({ isLive: false, createdBy: 'admin,user1' }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockHttp.get).toHaveBeenCalledWith('/api/osquery/saved_queries', {
      version: '2023-10-31',
      query: expect.objectContaining({ createdBy: 'admin,user1' }),
    });
  });

  it('omits search and createdBy when not provided', async () => {
    const { result } = renderHook(() => useSavedQueries({ isLive: false }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const callQuery = mockHttp.get.mock.calls[0][1].query;
    expect(callQuery).not.toHaveProperty('search');
    expect(callQuery).not.toHaveProperty('createdBy');
  });

  it('passes custom pagination and sort parameters', async () => {
    const { result } = renderHook(
      () =>
        useSavedQueries({
          isLive: false,
          pageIndex: 2,
          pageSize: 25,
          sortField: 'id',
          sortOrder: 'asc',
        }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockHttp.get).toHaveBeenCalledWith('/api/osquery/saved_queries', {
      version: '2023-10-31',
      query: {
        page: 3,
        pageSize: 25,
        sort: 'id',
        sortOrder: 'asc',
      },
    });
  });

  it('omits empty search string', async () => {
    const { result } = renderHook(() => useSavedQueries({ isLive: false, search: '' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const callQuery = mockHttp.get.mock.calls[0][1].query;
    expect(callQuery).not.toHaveProperty('search');
  });

  it('strips wildcard and special characters from search', async () => {
    const { result } = renderHook(() => useSavedQueries({ isLive: false, search: 'my*query?' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockHttp.get).toHaveBeenCalledWith('/api/osquery/saved_queries', {
      version: '2023-10-31',
      query: expect.objectContaining({ search: 'myquery' }),
    });
  });

  it('omits search when it contains only special characters', async () => {
    const { result } = renderHook(() => useSavedQueries({ isLive: false, search: '***' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const callQuery = mockHttp.get.mock.calls[0][1].query;
    expect(callQuery).not.toHaveProperty('search');
  });
});
