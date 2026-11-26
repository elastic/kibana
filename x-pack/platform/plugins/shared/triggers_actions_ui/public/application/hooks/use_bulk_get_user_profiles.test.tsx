/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { waitFor, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useBulkGetUserProfiles } from './use_bulk_get_user_profiles';
import { useKibana } from '../../common/lib/kibana';

jest.mock('../../common/lib/kibana');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
  },
});
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useBulkGetUserProfiles', () => {
  const bulkGet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    useKibanaMock().services.userProfile.bulkGet = bulkGet;
  });

  it('resolves uids to display names, preferring full_name, then email, then username', async () => {
    bulkGet.mockResolvedValue([
      {
        uid: 'u_1',
        user: { username: 'user.one', full_name: 'User One', email: 'user.one@elastic.co' },
      },
      { uid: 'u_2', user: { username: 'user.two', email: 'user.two@elastic.co' } },
      { uid: 'u_3', user: { username: 'user.three' } },
    ]);

    const { result } = renderHook(() => useBulkGetUserProfiles({ uids: ['u_1', 'u_2', 'u_3'] }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data?.get('u_1')).toBe('User One');
      expect(result.current.data?.get('u_2')).toBe('user.two@elastic.co');
      expect(result.current.data?.get('u_3')).toBe('user.three');
    });
    expect(result.current.isLoading).toBe(false);
  });

  it('dedupes uids and issues a single bulkGet call', async () => {
    bulkGet.mockResolvedValue([{ uid: 'u_1', user: { username: 'user.one' } }]);

    renderHook(() => useBulkGetUserProfiles({ uids: ['u_1', 'u_1'] }), { wrapper });

    await waitFor(() => {
      expect(bulkGet).toHaveBeenCalledTimes(1);
      expect(bulkGet).toHaveBeenCalledWith({ uids: new Set(['u_1']) });
    });
  });

  it('does not call bulkGet and returns undefined data when uids is empty', async () => {
    const { result } = renderHook(() => useBulkGetUserProfiles({ uids: [] }), { wrapper });

    expect(bulkGet).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
    expect(result.current.isFetching).toBe(false);
  });
});
