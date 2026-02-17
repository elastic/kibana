/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@kbn/react-query';
import { act, renderHook } from '@testing-library/react';
import type { AnonymizationProfile } from '@kbn/anonymization-common';
import type { FindAnonymizationProfilesResponse } from '@kbn/anonymization-common';
import { mapProfilesApiError } from '../services/profiles/errors';
import { useFindProfiles } from '../services/profiles/hooks/use_find_profiles';
import { TARGET_TYPE_INDEX } from '../../target_types';
import { useProfilesListView } from './use_profiles_list_view';

jest.mock('../services/profiles/hooks/use_find_profiles', () => ({
  useFindProfiles: jest.fn(),
}));

const createProfile = (id: string): AnonymizationProfile => ({
  id,
  name: `profile-${id}`,
  targetType: TARGET_TYPE_INDEX,
  targetId: `logs-${id}`,
  rules: { fieldRules: [], regexRules: [], nerRules: [] },
  saltId: 'salt-default',
  namespace: 'default',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdBy: 'elastic',
  updatedBy: 'elastic',
});

const client = {
  findProfiles: jest.fn(),
  getProfile: jest.fn(),
  createProfile: jest.fn(),
  updateProfile: jest.fn(),
  deleteProfile: jest.fn(),
};

describe('useProfilesListView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes default list state and maps query results', () => {
    const refetch = jest.fn();
    jest.mocked(useFindProfiles).mockReturnValue({
      data: {
        page: 1,
        perPage: 20,
        total: 1,
        data: [createProfile('1')],
      },
      isLoading: false,
      error: undefined,
      refetch,
    } as unknown as UseQueryResult<FindAnonymizationProfilesResponse>);

    const { result } = renderHook(() =>
      useProfilesListView({
        client,
        context: { spaceId: 'default' },
      })
    );

    expect(result.current.filters.targetId).toBe('');
    expect(result.current.pagination).toEqual({ page: 1, perPage: 20 });
    expect(result.current.profiles).toHaveLength(1);
    expect(result.current.total).toBe(1);
  });

  it('resets pagination when filter setters are called', () => {
    jest.mocked(useFindProfiles).mockImplementation(
      ({ query }) =>
        ({
          data: {
            page: query.page ?? 1,
            perPage: query.perPage ?? 20,
            total: 0,
            data: [],
          },
          isLoading: false,
          error: undefined,
          refetch: jest.fn(),
        } as unknown as UseQueryResult<FindAnonymizationProfilesResponse>)
    );

    const { result } = renderHook(() =>
      useProfilesListView({
        client,
        context: { spaceId: 'default' },
      })
    );

    act(() => {
      result.current.setPage(3);
    });
    expect(result.current.pagination.page).toBe(3);

    act(() => {
      result.current.setTargetId('host.name');
    });
    expect(result.current.pagination.page).toBe(1);
    expect(result.current.query.targetId).toBe('host.name');
  });

  it('forwards refetch', async () => {
    const refetch = jest.fn().mockResolvedValue({ data: undefined });
    jest.mocked(useFindProfiles).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: undefined,
      refetch,
    } as unknown as UseQueryResult<FindAnonymizationProfilesResponse>);

    const { result } = renderHook(() =>
      useProfilesListView({
        client,
        context: { spaceId: 'default' },
      })
    );

    await result.current.refetch();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('sets error only for ProfilesApiError shapes', () => {
    jest.mocked(useFindProfiles).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('plain'),
      refetch: jest.fn(),
    } as unknown as UseQueryResult<FindAnonymizationProfilesResponse>);

    const { result, rerender } = renderHook(() =>
      useProfilesListView({
        client,
        context: { spaceId: 'default' },
      })
    );
    expect(result.current.error).toBeUndefined();

    jest.mocked(useFindProfiles).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: mapProfilesApiError({ statusCode: 403 }),
      refetch: jest.fn(),
    } as unknown as UseQueryResult<FindAnonymizationProfilesResponse>);
    rerender();
    expect(result.current.error?.kind).toBe('forbidden');
  });
});
