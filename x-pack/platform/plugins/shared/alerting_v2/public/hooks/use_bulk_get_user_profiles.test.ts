/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { userProfileKeys } from './query_key_factory';
import { useBulkGetUserProfiles } from './use_bulk_get_user_profiles';

const mockBulkGet = jest.fn();

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'userProfile') {
      return { bulkGet: mockBulkGet };
    }
    return undefined;
  },
  CoreStart: (key: string) => key,
}));

const ALICE_UID = 'u_alice_uid';
const BOB_UID = 'u_bob_uid';

const ALICE_PROFILE = {
  uid: ALICE_UID,
  enabled: true,
  data: {},
  user: { username: 'alice', full_name: 'Alice Example' },
};
const BOB_PROFILE = {
  uid: BOB_UID,
  enabled: true,
  data: {},
  user: { username: 'bob', full_name: 'Bob Example' },
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { wrapper, queryClient };
};

describe('useBulkGetUserProfiles', () => {
  beforeEach(() => {
    mockBulkGet.mockReset();
  });

  it('calls bulkGet with the provided uids as a Set', async () => {
    mockBulkGet.mockResolvedValue([]);

    const { wrapper } = createWrapper();
    renderHook(() => useBulkGetUserProfiles({ uids: [ALICE_UID, BOB_UID] }), { wrapper });

    await waitFor(() => expect(mockBulkGet).toHaveBeenCalledTimes(1));
    expect(mockBulkGet).toHaveBeenCalledWith({ uids: new Set([ALICE_UID, BOB_UID]) });
  });

  it('returns the profiles as a Map keyed by uid', async () => {
    mockBulkGet.mockResolvedValue([ALICE_PROFILE, BOB_PROFILE]);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBulkGetUserProfiles({ uids: [ALICE_UID, BOB_UID] }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeInstanceOf(Map);
    expect(result.current.data?.size).toBe(2);
    expect(result.current.data?.get(ALICE_UID)).toEqual(ALICE_PROFILE);
    expect(result.current.data?.get(BOB_UID)).toEqual(BOB_PROFILE);
  });

  it('does not call bulkGet when uids is empty', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBulkGetUserProfiles({ uids: [] }), { wrapper });

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(mockBulkGet).not.toHaveBeenCalled();
  });

  it('caches the response under a sorted query key', async () => {
    mockBulkGet.mockResolvedValue([ALICE_PROFILE, BOB_PROFILE]);

    const { wrapper, queryClient } = createWrapper();
    renderHook(() => useBulkGetUserProfiles({ uids: [BOB_UID, ALICE_UID] }), { wrapper });

    await waitFor(() => expect(mockBulkGet).toHaveBeenCalled());

    // Different input order, same cache slot because the key is sorted.
    const cached = queryClient.getQueryData(userProfileKeys.bulk([ALICE_UID, BOB_UID]));
    expect(cached).toEqual([ALICE_PROFILE, BOB_PROFILE]);
  });

  it('exposes isError and the error when bulkGet rejects', async () => {
    const error = new Error('boom');
    mockBulkGet.mockRejectedValue(error);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBulkGetUserProfiles({ uids: [ALICE_UID] }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(error);
  });
});
