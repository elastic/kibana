/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@kbn/react-query';
import { act, renderHook } from '@testing-library/react';
import type { AnonymizationProfile } from '@kbn/anonymization-common';
import { mapProfilesApiError } from '../../common/services/profiles/errors';
import { useFindAllProfiles } from '../../common/services/profiles/hooks/use_find_all_profiles';
import { TARGET_TYPE_INDEX } from '../../common/target_types';
import { useProfilesListView } from './use_profiles_list_view';

jest.mock('../../common/services/profiles/hooks/use_find_all_profiles', () => ({
  useFindAllProfiles: jest.fn(),
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
    jest.mocked(useFindAllProfiles).mockReturnValue({
      data: [createProfile('1')],
      isLoading: false,
      error: undefined,
      refetch,
    } as unknown as UseQueryResult<AnonymizationProfile[]>);

    const { result } = renderHook(() =>
      useProfilesListView({
        client,
        context: { spaceId: 'default' },
      })
    );

    expect(result.current.filters.queryText).toBe('');
    expect(result.current.pagination).toEqual({ page: 1, perPage: 20 });
    expect(result.current.profiles).toHaveLength(1);
    expect(result.current.total).toBe(1);
  });

  it('resets pagination when filter setters are called', () => {
    jest.mocked(useFindAllProfiles).mockReturnValue({
      data: [],
      isLoading: false,
      error: undefined,
      refetch: jest.fn(),
    } as unknown as UseQueryResult<AnonymizationProfile[]>);

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
    expect(result.current.query.filter).toBe('host.name');
  });

  it('forwards refetch', async () => {
    const refetch = jest.fn().mockResolvedValue({ data: undefined });
    jest.mocked(useFindAllProfiles).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: undefined,
      refetch,
    } as unknown as UseQueryResult<AnonymizationProfile[]>);

    const { result } = renderHook(() =>
      useProfilesListView({
        client,
        context: { spaceId: 'default' },
      })
    );

    await result.current.refetch();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('passes enabled flag to the profiles query', () => {
    jest.mocked(useFindAllProfiles).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: undefined,
      refetch: jest.fn(),
    } as unknown as UseQueryResult<AnonymizationProfile[]>);

    renderHook(() =>
      useProfilesListView({
        client,
        context: { spaceId: 'default' },
        enabled: false,
      })
    );

    expect(useFindAllProfiles).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('normalizes unknown errors and preserves mapped API errors', () => {
    jest.mocked(useFindAllProfiles).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('plain'),
      refetch: jest.fn(),
    } as unknown as UseQueryResult<AnonymizationProfile[]>);

    const { result, rerender } = renderHook(() =>
      useProfilesListView({
        client,
        context: { spaceId: 'default' },
      })
    );
    expect(result.current.error?.kind).toBe('unknown');
    expect(result.current.error?.message).toBe('plain');

    jest.mocked(useFindAllProfiles).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: mapProfilesApiError({ statusCode: 403 }),
      refetch: jest.fn(),
    } as unknown as UseQueryResult<AnonymizationProfile[]>);
    rerender();
    expect(result.current.error?.kind).toBe('forbidden');
  });

  it('filters by partial name or target id locally', () => {
    const profiles = [
      { ...createProfile('1'), name: 'Global Anonymization Profile', targetId: '__kbn_global__' },
      { ...createProfile('2'), name: 'test', targetId: 'kibana_sample_data_ecommerce' },
    ];
    jest.mocked(useFindAllProfiles).mockReturnValue({
      data: profiles,
      isLoading: false,
      error: undefined,
      refetch: jest.fn(),
    } as unknown as UseQueryResult<AnonymizationProfile[]>);

    const { result } = renderHook(() =>
      useProfilesListView({
        client,
        context: { spaceId: 'default' },
      })
    );

    act(() => {
      result.current.setTargetId('ecomm');
    });
    expect(result.current.total).toBe(1);
    expect(result.current.profiles[0]?.id).toBe('2');

    act(() => {
      result.current.setTargetId('global');
    });
    expect(result.current.total).toBe(1);
    expect(result.current.profiles[0]?.id).toBe('1');
  });
});
