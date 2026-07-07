/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClientProvider, QueryClient } from '@kbn/react-query';
import { useKibana } from './lib/kibana';
import { useGenericBulkGetUserProfiles } from './use_bulk_get_user_profiles';

jest.mock('./lib/kibana');

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  return Wrapper;
};

const MOCK_PROFILES = [
  { uid: 'uid-1', user: { username: 'admin', full_name: 'Admin User' }, data: { avatar: {} } },
  { uid: 'uid-2', user: { username: 'user1', full_name: 'User One' }, data: { avatar: {} } },
];

describe('useGenericBulkGetUserProfiles', () => {
  let mockBulkGet: jest.Mock;
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockBulkGet = jest.fn().mockResolvedValue(MOCK_PROFILES);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
      logger: { log: () => null, warn: () => null, error: () => null },
    });

    useKibanaMock.mockReturnValue({
      services: {
        userProfile: { bulkGet: mockBulkGet },
      },
    } as unknown as ReturnType<typeof useKibana>);
  });

  it('fetches profiles and returns a map keyed by uid', async () => {
    const { result } = renderHook(() => useGenericBulkGetUserProfiles(['uid-1', 'uid-2']), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.profilesMap.size).toBe(2));

    expect(result.current.profilesMap.get('uid-1')?.user.username).toBe('admin');
    expect(result.current.profilesMap.get('uid-2')?.user.username).toBe('user1');
  });

  it('calls bulkGet with deduplicated and sorted uids', async () => {
    const { result } = renderHook(
      () => useGenericBulkGetUserProfiles(['uid-2', 'uid-1', 'uid-2', 'uid-1']),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.profilesMap.size).toBe(2));

    expect(mockBulkGet).toHaveBeenCalledTimes(1);
    const calledUids = Array.from(mockBulkGet.mock.calls[0][0].uids);
    expect(calledUids).toEqual(['uid-1', 'uid-2']);
  });

  it('does not call bulkGet when uids array is empty', () => {
    renderHook(() => useGenericBulkGetUserProfiles([]), {
      wrapper: createWrapper(queryClient),
    });

    expect(mockBulkGet).not.toHaveBeenCalled();
  });

  it('returns empty map and isLoading false when uids are empty', () => {
    const { result } = renderHook(() => useGenericBulkGetUserProfiles([]), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.profilesMap.size).toBe(0);
    expect(result.current.isLoading).toBe(false);
  });

  it('requests avatar data path', async () => {
    mockBulkGet.mockResolvedValue([MOCK_PROFILES[0]]);

    const { result } = renderHook(() => useGenericBulkGetUserProfiles(['uid-1']), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.profilesMap.size).toBe(1));

    expect(mockBulkGet).toHaveBeenCalledWith({
      uids: new Set(['uid-1']),
      dataPath: 'avatar',
    });
  });
});
