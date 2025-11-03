/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useSuggestUserProfiles } from './use_suggest_user_profiles';
import { TestProviders } from '../../mock/test_providers/test_providers';
import { MOCK_CURRENT_USER, MOCK_USER_PROFILE } from '../../mock/conversation';
import { useAssistantContext } from '../../..';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { UserProfile } from '@kbn/core-user-profile-common';
const mockSearchTerm = 'testing123';
const testProps = {
  searchTerm: mockSearchTerm,
  forbiddenUsers: [MOCK_CURRENT_USER.id],
  size: 5,
  onDebounce: jest.fn(),
};
jest.mock('../../..');
const mockUsers = [MOCK_USER_PROFILE];
const http = {
  post: jest.fn().mockResolvedValue(mockUsers),
} as unknown as HttpSetup;

describe('useSuggestUserProfiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAssistantContext as jest.Mock).mockReturnValue({
      http,
      assistantAvailability: {
        isAssistantEnabled: true,
      },
    });
  });
  it('should debounce search term and fetch user profiles', async () => {
    const { result } = renderHook(() => useSuggestUserProfiles(testProps), {
      wrapper: TestProviders,
    });
    // Initial state
    expect(result.current.isLoading).toBe(true);
    // Wait for debounce and fetch
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
      expect(result.current.data).toEqual(mockUsers);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should call onDebounce when searchTerm changes', async () => {
    const onDebounce = jest.fn();
    const initialProps = { ...testProps, onDebounce };
    const { rerender } = renderHook(() => useSuggestUserProfiles(initialProps), {
      initialProps,
      wrapper: TestProviders,
    });
    act(() => {
      rerender({ ...testProps, searchTerm: 'new term' });
    });
    await waitFor(() => {
      expect(onDebounce).toHaveBeenCalled();
    });
  });

  it('should filter forbidden users from results', async () => {
    const { result } = renderHook(() => useSuggestUserProfiles(testProps), {
      wrapper: TestProviders,
    });
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
      result.current.data?.forEach((user: UserProfile) => {
        expect(testProps.forbiddenUsers).not.toContain(user.uid);
      });
    });
  });
});
