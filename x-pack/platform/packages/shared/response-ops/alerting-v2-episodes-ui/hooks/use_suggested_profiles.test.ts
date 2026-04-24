/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import { ALERTING_V2_INTERNAL_SUGGEST_USER_PROFILES_API_PATH } from '@kbn/alerting-v2-constants';

import { createQueryClientWrapper, createTestQueryClient } from './test_utils';
import { useSuggestedProfiles } from './use_suggested_profiles';

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

describe('useSuggestedProfiles', () => {
  const toasts = { addError: jest.fn() };
  const errorTitle = 'Suggest failed';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('does not call suggest when the search term is empty or whitespace-only', () => {
    const suggest = jest.fn();
    const userProfile = { suggest } as unknown as UserProfileService;

    renderHook(
      () =>
        useSuggestedProfiles({
          userProfile,
          searchTerm: '   ',
          toasts,
          errorTitle,
        }),
      { wrapper }
    );

    expect(suggest).not.toHaveBeenCalled();
  });

  it('calls suggest with the internal path and trimmed name when the search term is non-empty', async () => {
    const profiles = [{ uid: 'u-1' }];
    const suggest = jest.fn().mockResolvedValue(profiles);
    const userProfile = { suggest } as unknown as UserProfileService;

    const { result } = renderHook(
      () =>
        useSuggestedProfiles({
          userProfile,
          searchTerm: '  alice  ',
          toasts,
          errorTitle,
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(suggest).toHaveBeenCalledWith(ALERTING_V2_INTERNAL_SUGGEST_USER_PROFILES_API_PATH, {
      name: 'alice',
      size: 20,
    });
    expect(result.current.data).toEqual(profiles);
  });
});
