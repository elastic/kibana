/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { useGetUserProfileQuery } from './use_get_user_profile_query';
import { UserProfileService } from '@kbn/core/public';
import { QueryClientProvider } from '@tanstack/react-query';
import * as reactQuery from '@tanstack/react-query';
import { PropsWithChildren } from 'react';
import { testQueryClient } from '../test_utils/test_query_client';

const useQuerySpy = jest.spyOn(reactQuery, 'useQuery');

const mockUserProfileService = {
  getCurrent: jest.fn(),
};

const wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={testQueryClient}>{children}</QueryClientProvider>
);

describe('useGetUserProfileQuery', () => {
  beforeEach(() => {
    testQueryClient.clear();
    jest.clearAllMocks();
  });

  it('should call userProfileService.getCurrent and returns the user profile', async () => {
    const mockProfile = { user: 'test-user' };
    mockUserProfileService.getCurrent.mockResolvedValue(mockProfile);

    const { result } = renderHook(
      () =>
        useGetUserProfileQuery({
          userProfileService: mockUserProfileService as unknown as UserProfileService,
        }),
      { wrapper }
    );

    await waitFor(() => result.current.isSuccess);

    expect(mockUserProfileService.getCurrent).toHaveBeenCalled();
    expect(result.current.data).toEqual(mockProfile);
  });

  it('should not enable the query if userProfileService is not provided', async () => {
    const { result } = renderHook(() => useGetUserProfileQuery({ userProfileService: undefined }), {
      wrapper,
    });

    expect(useQuerySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
    expect(result.current.data).toBeUndefined();
  });
});
