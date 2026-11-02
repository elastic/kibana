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
import { usePackUsers, useSavedQueryUsers } from './use_saved_object_users';

jest.mock('./lib/kibana');

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  return Wrapper;
};

const MOCK_PROFILES = [
  { uid: 'uid-alice', user: { username: 'alice', full_name: 'Alice' }, data: { avatar: {} } },
  { uid: 'uid-bob', user: { username: 'bob', full_name: 'Bob' }, data: { avatar: {} } },
];

const MOCK_USERS_RESPONSE = {
  data: [
    { created_by: 'alice', created_by_profile_uid: 'uid-alice' },
    { created_by: 'bob', created_by_profile_uid: 'uid-bob' },
  ],
};

describe('usePackUsers', () => {
  let mockHttpGet: jest.Mock;
  let mockBulkGet: jest.Mock;
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHttpGet = jest.fn().mockResolvedValue(MOCK_USERS_RESPONSE);
    mockBulkGet = jest.fn().mockResolvedValue(MOCK_PROFILES);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
      logger: { log: () => null, warn: () => null, error: () => null },
    });

    useKibanaMock.mockReturnValue({
      services: {
        http: { get: mockHttpGet },
        userProfile: { bulkGet: mockBulkGet },
      },
    } as unknown as ReturnType<typeof useKibana>);
  });

  it('fetches users and enriches with user profiles', async () => {
    const { result } = renderHook(() => usePackUsers(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.users).toHaveLength(2));

    expect(result.current.users).toEqual(['alice', 'bob']);
    expect(result.current.profilesMap.size).toBe(2);
    expect(result.current.profilesMap.get('uid-alice')?.user.username).toBe('alice');
    expect(result.current.profilesMap.get('uid-bob')?.user.username).toBe('bob');
  });

  it('calls the packs users endpoint', async () => {
    const { result } = renderHook(() => usePackUsers(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.users).toHaveLength(2));

    expect(mockHttpGet).toHaveBeenCalledWith('/internal/osquery/packs/users', {
      version: '1',
    });
  });

  it('bulk-fetches profiles only for users with profile UIDs', async () => {
    mockHttpGet.mockResolvedValue({
      data: [
        { created_by: 'alice', created_by_profile_uid: 'uid-alice' },
        { created_by: 'legacy-user' },
      ],
    });
    mockBulkGet.mockResolvedValue([MOCK_PROFILES[0]]);

    const { result } = renderHook(() => usePackUsers(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.users).toHaveLength(2));

    expect(mockBulkGet).toHaveBeenCalledWith({
      uids: new Set(['uid-alice']),
      dataPath: 'avatar',
    });
  });

  it('does not fetch profiles when no users have profile UIDs', async () => {
    mockHttpGet.mockResolvedValue({
      data: [{ created_by: 'legacy-user' }],
    });

    const { result } = renderHook(() => usePackUsers(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.users).toHaveLength(1));

    expect(mockBulkGet).not.toHaveBeenCalled();
    expect(result.current.profilesMap.size).toBe(0);
  });

  it('returns empty users when endpoint returns empty data', async () => {
    mockHttpGet.mockResolvedValue({ data: [] });

    const { result } = renderHook(() => usePackUsers(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.users).toEqual([]);
    expect(result.current.profilesMap.size).toBe(0);
  });
});

describe('useSavedQueryUsers', () => {
  let mockHttpGet: jest.Mock;
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHttpGet = jest.fn().mockResolvedValue(MOCK_USERS_RESPONSE);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
      logger: { log: () => null, warn: () => null, error: () => null },
    });

    useKibanaMock.mockReturnValue({
      services: {
        http: { get: mockHttpGet },
        userProfile: { bulkGet: jest.fn().mockResolvedValue(MOCK_PROFILES) },
      },
    } as unknown as ReturnType<typeof useKibana>);
  });

  it('calls the saved queries users endpoint', async () => {
    const { result } = renderHook(() => useSavedQueryUsers(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.users).toHaveLength(2));

    expect(mockHttpGet).toHaveBeenCalledWith('/internal/osquery/saved_queries/users', {
      version: '1',
    });
  });
});
