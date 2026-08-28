/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useUserProfiles } from './use_user_profiles';

const mockBulkGet = jest.fn();

jest.mock('./use_kibana', () => ({
  useKibana: () => ({
    services: {
      userProfile: {
        bulkGet: mockBulkGet,
      },
    },
  }),
}));

const memberProfile = {
  uid: 'member-1',
  user: { username: 'alex', full_name: 'Alex Kim' },
  data: {},
  enabled: true,
};

const secondMemberProfile = {
  uid: 'member-2',
  user: { username: 'sam', full_name: 'Sam Delacroix' },
  data: {},
  enabled: true,
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'UseUserProfilesTestWrapper';

  return Wrapper;
};

describe('useUserProfiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBulkGet.mockResolvedValue([memberProfile, secondMemberProfile]);
  });

  it('fetches deduplicated user profiles with avatars by uid', async () => {
    const { result } = renderHook(
      () => useUserProfiles({ uids: ['member-2', 'member-1', 'member-2'] }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.data).toEqual([memberProfile, secondMemberProfile]);
    });

    expect(mockBulkGet).toHaveBeenCalledTimes(1);
    expect(mockBulkGet).toHaveBeenCalledWith({
      uids: new Set(['member-1', 'member-2']),
      dataPath: 'avatar',
    });
  });

  it('does not fetch user profiles without uids', () => {
    renderHook(() => useUserProfiles({ uids: [] }), { wrapper: createWrapper() });

    expect(mockBulkGet).not.toHaveBeenCalled();
  });
});
