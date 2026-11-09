/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { CaseUser } from '../../../containers/types';
import { useGetCurrentUserProfile } from '../../../containers/user_profiles/use_get_current_user_profile';
import { useIsAuthor } from './use_is_author';

jest.mock('../../../containers/user_profiles/use_get_current_user_profile');

const useGetCurrentUserProfileMock = useGetCurrentUserProfile as jest.Mock;

const toCaseUser = (username: string, profileUid?: string): CaseUser => ({
  username,
  profileUid,
  fullName: null,
  email: null,
});

describe('useIsAuthor', () => {
  beforeEach(() => {
    useGetCurrentUserProfileMock.mockReturnValue({
      data: { uid: 'me-uid', user: { username: 'me' } },
    });
  });

  it.each([
    ['the same profile', toCaseUser('other', 'me-uid'), true],
    ['another profile', toCaseUser('me', 'other-uid'), false],
    ['the same username without a profile', toCaseUser('me'), true],
    ['another username without a profile', toCaseUser('other'), false],
  ])('matches %s', (_, createdBy, expected) => {
    const { result } = renderHook(() => useIsAuthor(createdBy));

    expect(result.current).toBe(expected);
  });

  it('is false while the current user is unknown', () => {
    useGetCurrentUserProfileMock.mockReturnValue({ data: undefined });

    const { result } = renderHook(() => useIsAuthor(toCaseUser('me', 'me-uid')));

    expect(result.current).toBe(false);
  });
});
