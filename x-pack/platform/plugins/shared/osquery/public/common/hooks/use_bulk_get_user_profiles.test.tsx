/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useBulkGetUserProfiles } from './use_bulk_get_user_profiles';
import { useKibana } from '../lib/kibana';

jest.mock('../lib/kibana');

const mockUseKibana = useKibana as jest.Mock;

const mockUserProfiles = [
  {
    uid: 'user-id-1',
    enabled: true,
    user: {
      username: 'user1',
      full_name: 'User One',
      email: 'user1@example.com',
    },
    data: {},
  },
  {
    uid: 'user-id-2',
    enabled: true,
    user: {
      username: 'user2',
      full_name: 'User Two',
      email: 'user2@example.com',
    },
    data: {},
  },
];

const mockBulkGet = jest.fn().mockResolvedValue(mockUserProfiles);

describe('useBulkGetUserProfiles', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();

    mockUseKibana.mockReturnValue({
      services: {
        security: {
          userProfiles: {
            bulkGet: mockBulkGet,
          },
        },
      },
    });
  });

  it('should fetch user profiles for provided uids', async () => {
    const uids = new Set(['user-id-1', 'user-id-2']);

    const { result, waitFor } = renderHook(() => useBulkGetUserProfiles({ uids }), { wrapper });

    await waitFor(() => result.current.isSuccess);

    expect(mockBulkGet).toHaveBeenCalledWith({
      uids,
      dataPath: 'avatar',
    });

    expect(result.current.data).toEqual(mockUserProfiles);
  });

  it('should return empty array when uids set is empty', async () => {
    const uids = new Set<string>();

    const { result, waitFor } = renderHook(() => useBulkGetUserProfiles({ uids }), { wrapper });

    await waitFor(() => result.current.isSuccess);

    expect(mockBulkGet).not.toHaveBeenCalled();
    expect(result.current.data).toEqual([]);
  });

  it('should handle errors when fetching user profiles', async () => {
    const uids = new Set(['user-id-1']);
    const errorMessage = 'Failed to fetch user profiles';

    mockBulkGet.mockRejectedValueOnce(new Error(errorMessage));

    const { result, waitFor } = renderHook(() => useBulkGetUserProfiles({ uids }), { wrapper });

    await waitFor(() => result.current.isError);

    expect(result.current.error).toBeDefined();
  });

  it('should cache results with staleTime: Infinity', async () => {
    const uids = new Set(['user-id-1']);

    const { result: result1, waitFor } = renderHook(() => useBulkGetUserProfiles({ uids }), {
      wrapper,
    });

    await waitFor(() => result1.current.isSuccess);

    expect(mockBulkGet).toHaveBeenCalledTimes(1);

    // Second render should use cached data
    const { result: result2 } = renderHook(() => useBulkGetUserProfiles({ uids }), { wrapper });

    expect(result2.current.data).toEqual(mockUserProfiles);
    expect(mockBulkGet).toHaveBeenCalledTimes(1); // Should not call again
  });
});
