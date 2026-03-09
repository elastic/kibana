/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useCurrentUser } from './use_current_user';

const mockGetCurrent = jest.fn();

jest.mock('../use_kibana', () => ({
  useKibana: () => ({
    services: {
      userProfile: {
        getCurrent: mockGetCurrent,
      },
    },
  }),
}));

const mockUseQuery = jest.fn();
jest.mock('@kbn/react-query', () => ({
  useQuery: (options: {
    queryKey: string[];
    queryFn: () => Promise<{ uid: string; user: { username: string } }>;
    enabled: boolean;
  }) => mockUseQuery(options),
}));

describe('useCurrentUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: false });
  });

  it('passes enabled: false to useQuery and does not call getCurrent', () => {
    renderHook(() => useCurrentUser({ enabled: false }));

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['agentBuilder', 'currentUser'],
        enabled: false,
      })
    );
    expect(mockGetCurrent).not.toHaveBeenCalled();
  });

  it('passes enabled: true and queryFn that calls userProfile.getCurrent', async () => {
    mockGetCurrent.mockResolvedValue({
      uid: 'user-123',
      user: { username: 'testuser' },
    });

    let capturedQueryFn: (() => Promise<unknown>) | undefined;
    mockUseQuery.mockImplementation((options: { queryFn: () => Promise<unknown> }) => {
      capturedQueryFn = options.queryFn;
      return { data: undefined, isLoading: true };
    });

    renderHook(() => useCurrentUser({ enabled: true }));

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['agentBuilder', 'currentUser'],
        enabled: true,
      })
    );

    const raw = await capturedQueryFn!();
    expect(mockGetCurrent).toHaveBeenCalledTimes(1);
    expect(raw).toEqual({ uid: 'user-123', user: { username: 'testuser' } });
  });

  it('returns null currentUser when useQuery returns data undefined', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: false });

    const { result } = renderHook(() => useCurrentUser({ enabled: true }));

    expect(result.current.currentUser).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('maps query data to currentUser', () => {
    mockUseQuery.mockReturnValue({
      data: { uid: 'user-123', user: { username: 'testuser' } },
      isLoading: false,
    });

    const { result } = renderHook(() => useCurrentUser({ enabled: true }));

    expect(result.current.currentUser).toEqual({
      id: 'user-123',
      username: 'testuser',
    });
    expect(result.current.isLoading).toBe(false);
  });
});
