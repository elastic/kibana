/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { CoreStart } from '@kbn/core/public';
import { useCurrentUserProfile } from './use_current_user_profile';

const mockGetCurrent = jest.fn();

const mockUserProfile = {
  getCurrent: mockGetCurrent,
} as unknown as CoreStart['userProfile'];

const wrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

afterEach(() => {
  jest.clearAllMocks();
});

describe('useCurrentUserProfile', () => {
  it('returns the current user profile', async () => {
    mockGetCurrent.mockResolvedValue({ uid: 'user-123' });

    const { result } = renderHook(() => useCurrentUserProfile({ userProfile: mockUserProfile }), {
      wrapper: wrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetCurrent).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual({ uid: 'user-123' });
  });
});
