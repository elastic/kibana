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
import { usePacks } from './use_packs';

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
  data: [
    {
      saved_object_id: 'pack-1',
      name: 'hardware-monitoring',
      description: 'Monitor hardware status',
      queries: { acpi_tables: { query: 'select * from acpi_tables', interval: 86400 } },
      enabled: true,
      created_at: '2026-01-01T00:00:00Z',
      created_by: 'elastic',
      created_by_profile_uid: 'uid-1',
      updated_at: '2026-01-01T00:00:00Z',
      updated_by: 'elastic',
      updated_by_profile_uid: 'uid-1',
      policy_ids: ['policy-1'],
    },
    {
      saved_object_id: 'pack-2',
      name: 'incident-response',
      description: 'Incident response queries',
      queries: {},
      enabled: false,
      created_at: '2026-01-02T00:00:00Z',
      created_by: 'admin',
      updated_at: '2026-01-02T00:00:00Z',
      updated_by: 'admin',
      policy_ids: [],
    },
  ],
};

describe('usePacks', () => {
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

  it('fetches packs with default parameters', async () => {
    const { result } = renderHook(() => usePacks({}), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockHttp.get).toHaveBeenCalledWith('/api/osquery/packs', {
      version: '2023-10-31',
      query: {
        page: 1,
        pageSize: 100,
        sort: 'updated_at',
        sortOrder: 'desc',
      },
    });

    expect(result.current.data).toEqual(MOCK_RESPONSE);
  });

  it('passes search parameter when provided', async () => {
    const { result } = renderHook(() => usePacks({ search: 'hardware' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockHttp.get).toHaveBeenCalledWith('/api/osquery/packs', {
      version: '2023-10-31',
      query: expect.objectContaining({ search: 'hardware' }),
    });
  });

  it('passes createdBy parameter when provided', async () => {
    const { result } = renderHook(() => usePacks({ createdBy: 'elastic,admin' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockHttp.get).toHaveBeenCalledWith('/api/osquery/packs', {
      version: '2023-10-31',
      query: expect.objectContaining({ createdBy: 'elastic,admin' }),
    });
  });

  it('passes enabled parameter when provided', async () => {
    const { result } = renderHook(() => usePacks({ enabled: 'true' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockHttp.get).toHaveBeenCalledWith('/api/osquery/packs', {
      version: '2023-10-31',
      query: expect.objectContaining({ enabled: 'true' }),
    });
  });

  it('omits search, createdBy, and enabled when not provided', async () => {
    const { result } = renderHook(() => usePacks({}), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const callQuery = mockHttp.get.mock.calls[0][1].query;
    expect(callQuery).not.toHaveProperty('search');
    expect(callQuery).not.toHaveProperty('createdBy');
    expect(callQuery).not.toHaveProperty('enabled');
  });

  it('passes custom pagination and sort parameters', async () => {
    const { result } = renderHook(
      () =>
        usePacks({
          pageIndex: 2,
          pageSize: 25,
          sortField: 'name',
          sortOrder: 'asc',
        }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockHttp.get).toHaveBeenCalledWith('/api/osquery/packs', {
      version: '2023-10-31',
      query: {
        page: 3,
        pageSize: 25,
        sort: 'name',
        sortOrder: 'asc',
      },
    });
  });

  it('omits empty search string', async () => {
    const { result } = renderHook(() => usePacks({ search: '' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const callQuery = mockHttp.get.mock.calls[0][1].query;
    expect(callQuery).not.toHaveProperty('search');
  });

  it('strips wildcard and special characters from search', async () => {
    const { result } = renderHook(() => usePacks({ search: 'hard*ware?' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockHttp.get).toHaveBeenCalledWith('/api/osquery/packs', {
      version: '2023-10-31',
      query: expect.objectContaining({ search: 'hardware' }),
    });
  });

  it('omits search when it contains only special characters', async () => {
    const { result } = renderHook(() => usePacks({ search: '***' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const callQuery = mockHttp.get.mock.calls[0][1].query;
    expect(callQuery).not.toHaveProperty('search');
  });
});
