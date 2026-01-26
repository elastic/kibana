/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import '@kbn/react-query/mock';
import * as ReactQuery from '@kbn/react-query';
import { useGetUserProfileQuery } from './use_get_user_profile_query';
import type { UserProfileService } from '@kbn/core/public';
import { createTestResponseOpsQueryClient } from '@kbn/response-ops-react-query/test_utils/create_test_response_ops_query_client';

const { useQuery } = ReactQuery;

const mockUserProfileService = {
  getCurrent: jest.fn(),
};

const { queryClient, provider: wrapper } = createTestResponseOpsQueryClient();

describe('useGetUserProfileQuery', () => {
  beforeEach(() => {
    queryClient.clear();
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

    await waitFor(() => {
      expect(result.current.isSuccess).toBeTruthy();
      expect(result.current.data).toEqual(mockProfile);
    });

    expect(mockUserProfileService.getCurrent).toHaveBeenCalled();
  });

  it('should not enable the query if userProfileService is not provided', async () => {
    const { result } = renderHook(() => useGetUserProfileQuery({ userProfileService: undefined }), {
      wrapper,
    });

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
    expect(result.current.data).toBeUndefined();
  });
});
