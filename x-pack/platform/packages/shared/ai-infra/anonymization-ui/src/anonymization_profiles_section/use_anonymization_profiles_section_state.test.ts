/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { act, renderHook } from '@testing-library/react';
import type { AnonymizationProfile } from '@kbn/anonymization-common';
import { TARGET_TYPE_INDEX } from '../common/target_types';
import type { ProfileFormValues } from '../common/hooks/profile_form_types';
import { createAnonymizationProfilesClient } from '../common/services/profiles/client';
import { useDeleteProfileFlow } from './hooks/use_delete_profile_flow';
import { useProfileForm } from '../common/hooks/use_profile_form';
import { useProfilesListView } from './hooks/use_profiles_list_view';
import { useAnonymizationProfilesSectionState } from './use_anonymization_profiles_section_state';

vi.mock('../common/services/profiles/client', () => {
      const mocked = {
      createAnonymizationProfilesClient: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./hooks/use_delete_profile_flow', () => {
      const mocked = {
      useDeleteProfileFlow: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../common/hooks/use_profile_form', () => {
      const mocked = {
      useProfileForm: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./hooks/use_profiles_list_view', () => {
      const mocked = {
      useProfilesListView: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const fetch = vi.fn();

const createListViewMock = (error?: unknown): ReturnType<typeof useProfilesListView> =>
  ({
    filters: { targetType: '', targetId: '' },
    pagination: { page: 1, perPage: 20 },
    query: {},
    profiles: [],
    total: 0,
    loading: false,
    error,
    setTargetType: vi.fn(),
    setTargetId: vi.fn(),
    setPage: vi.fn(),
    setPerPage: vi.fn(),
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useProfilesListView>);

const createDeleteFlowMock = (
  confirmDelete: Mock = vi.fn().mockResolvedValue(false),
  error?: unknown
): ReturnType<typeof useDeleteProfileFlow> =>
  ({
    pendingProfileId: undefined,
    isDeleting: false,
    error,
    openConfirmation: vi.fn(),
    cancel: vi.fn(),
    confirmDelete,
  } as unknown as ReturnType<typeof useDeleteProfileFlow>);

const createProfileFormMock = (
  submit: Mock = vi.fn().mockResolvedValue(undefined),
  submitError?: unknown,
  reset: Mock = vi.fn(),
  valuesOverrides: Partial<ProfileFormValues> = {}
): ReturnType<typeof useProfileForm> =>
  ({
    values: {
      name: '',
      description: '',
      targetType: TARGET_TYPE_INDEX,
      targetId: '',
      fieldRules: [],
      regexRules: [],
      nerRules: [],
      ...valuesOverrides,
    },
    validationErrors: {},
    submitError,
    isSubmitting: false,
    isEdit: false,
    reset,
    setName: vi.fn(),
    setDescription: vi.fn(),
    setTargetType: vi.fn(),
    setTargetId: vi.fn(),
    setFieldRules: vi.fn(),
    setRegexRules: vi.fn(),
    setNerRules: vi.fn(),
    submit,
  } as unknown as ReturnType<typeof useProfileForm>);

describe('useAnonymizationProfilesSectionState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createAnonymizationProfilesClient).mockReturnValue({
      findProfiles: vi.fn(),
      getProfile: vi.fn(),
      createProfile: vi.fn(),
      updateProfile: vi.fn(),
      deleteProfile: vi.fn(),
    });
    vi.mocked(useProfilesListView).mockReturnValue(createListViewMock());
    vi.mocked(useDeleteProfileFlow).mockReturnValue(createDeleteFlowMock());
    vi.mocked(useProfileForm).mockReturnValue(createProfileFormMock());
  });

  it('returns hidden mode when section visibility is disabled', () => {
    const { result } = renderHook(() =>
      useAnonymizationProfilesSectionState({
        fetch,
        spaceId: 'default',
        canShow: false,
        canManage: true,
      })
    );

    expect(result.current.effectiveMode).toBe('hidden');
    expect(result.current.isManageMode).toBe(false);
    expect(useProfilesListView).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('returns readOnly mode for forbidden API errors', () => {
    vi.mocked(useProfilesListView).mockReturnValue(createListViewMock({ kind: 'forbidden' }));

    const { result } = renderHook(() =>
      useAnonymizationProfilesSectionState({
        fetch,
        spaceId: 'default',
        canShow: true,
        canManage: true,
      })
    );

    expect(result.current.effectiveMode).toBe('readOnly');
    expect(result.current.hasReadOnlyApiError).toBe(true);
  });

  it('handles create submit success and calls onCreateSuccess', async () => {
    const onCreateSuccess = vi.fn();
    const reset = vi.fn();
    vi
      .mocked(useProfileForm)
      .mockReturnValue(
        createProfileFormMock(
          vi.fn().mockResolvedValue({ profile: { id: 'p1' } }),
          undefined,
          reset
        )
      );

    const { result } = renderHook(() =>
      useAnonymizationProfilesSectionState({
        fetch,
        spaceId: 'default',
        canShow: true,
        canManage: true,
        onCreateSuccess,
      })
    );

    act(() => {
      result.current.onCreateProfile();
    });
    expect(result.current.flyoutState).toEqual({ mode: 'create' });

    await act(async () => {
      await result.current.submitFlyout();
    });

    expect(onCreateSuccess).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);
    expect(result.current.flyoutState).toBeNull();
  });

  it('stores conflict profile id and calls onCreateConflict', async () => {
    const onCreateConflict = vi.fn();
    const matchingProfile = {
      id: 'profile-1',
      targetType: TARGET_TYPE_INDEX,
      targetId: 'logs-1',
    } as AnonymizationProfile;
    vi.mocked(useProfilesListView).mockReturnValue({
      ...createListViewMock(undefined),
      profiles: [matchingProfile],
    });
    vi.mocked(useProfileForm).mockReturnValue(
      createProfileFormMock(
        vi.fn().mockResolvedValue({
          isConflict: true,
        }),
        undefined,
        vi.fn(),
        { targetId: 'logs-1' }
      )
    );

    const { result } = renderHook(() =>
      useAnonymizationProfilesSectionState({
        fetch,
        spaceId: 'default',
        canShow: true,
        canManage: true,
        onCreateConflict,
      })
    );

    act(() => {
      result.current.onCreateProfile();
    });

    await act(async () => {
      await result.current.submitFlyout();
    });

    expect(result.current.createConflictProfileId).toBe('profile-1');
    expect(result.current.hasCreateConflict).toBe(true);
    expect(onCreateConflict).toHaveBeenCalledTimes(1);
  });

  it('confirms delete and notifies success callback', async () => {
    const onDeleteSuccess = vi.fn();
    vi
      .mocked(useDeleteProfileFlow)
      .mockReturnValue(createDeleteFlowMock(vi.fn().mockResolvedValue(true)));

    const { result } = renderHook(() =>
      useAnonymizationProfilesSectionState({
        fetch,
        spaceId: 'default',
        canShow: true,
        canManage: true,
        onDeleteSuccess,
      })
    );

    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(onDeleteSuccess).toHaveBeenCalledTimes(1);
  });

  it('opens profile by id and reports fetch errors', async () => {
    const onOpenConflictError = vi.fn();
    const getProfile = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ id: 'profile-1', name: 'Profile 1' });
    vi.mocked(createAnonymizationProfilesClient).mockReturnValue({
      findProfiles: vi.fn(),
      getProfile,
      createProfile: vi.fn(),
      updateProfile: vi.fn(),
      deleteProfile: vi.fn(),
    });

    const { result } = renderHook(() =>
      useAnonymizationProfilesSectionState({
        fetch,
        spaceId: 'default',
        canShow: true,
        canManage: true,
        onOpenConflictError,
      })
    );

    await act(async () => {
      await result.current.openProfileById('profile-1');
    });
    expect(onOpenConflictError).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.openProfileById('profile-1');
    });
    expect(result.current.flyoutState).toEqual({
      mode: 'edit',
      profile: { id: 'profile-1', name: 'Profile 1' },
    });
  });

  it('resets form values when canceling create flyout', () => {
    const reset = vi.fn();
    vi.mocked(useProfileForm).mockReturnValue(createProfileFormMock(undefined, undefined, reset));

    const { result } = renderHook(() =>
      useAnonymizationProfilesSectionState({
        fetch,
        spaceId: 'default',
        canShow: true,
        canManage: true,
      })
    );

    act(() => {
      result.current.onCreateProfile();
    });
    expect(result.current.flyoutState).toEqual({ mode: 'create' });

    act(() => {
      result.current.closeFlyout();
    });

    expect(reset).toHaveBeenCalledTimes(1);
    expect(result.current.flyoutState).toBeNull();
  });
});
