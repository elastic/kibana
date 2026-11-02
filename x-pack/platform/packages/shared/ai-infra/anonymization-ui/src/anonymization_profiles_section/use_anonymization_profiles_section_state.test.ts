/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import type { AnonymizationProfile } from '@kbn/anonymization-common';
import { TARGET_TYPE_INDEX } from '../common/target_types';
import type { ProfileFormValues } from '../common/hooks/profile_form_types';
import { createAnonymizationProfilesClient } from '../common/services/profiles/client';
import { useDeleteProfileFlow } from './hooks/use_delete_profile_flow';
import { useProfileForm } from '../common/hooks/use_profile_form';
import { useProfilesListView } from './hooks/use_profiles_list_view';
import { useAnonymizationProfilesSectionState } from './use_anonymization_profiles_section_state';

jest.mock('../common/services/profiles/client', () => ({
  createAnonymizationProfilesClient: jest.fn(),
}));
jest.mock('./hooks/use_delete_profile_flow', () => ({
  useDeleteProfileFlow: jest.fn(),
}));
jest.mock('../common/hooks/use_profile_form', () => ({
  useProfileForm: jest.fn(),
}));
jest.mock('./hooks/use_profiles_list_view', () => ({
  useProfilesListView: jest.fn(),
}));

const fetch = jest.fn();

const createListViewMock = (error?: unknown): ReturnType<typeof useProfilesListView> =>
  ({
    filters: { targetType: '', targetId: '' },
    pagination: { page: 1, perPage: 20 },
    query: {},
    profiles: [],
    total: 0,
    loading: false,
    error,
    setTargetType: jest.fn(),
    setTargetId: jest.fn(),
    setPage: jest.fn(),
    setPerPage: jest.fn(),
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useProfilesListView>);

const createDeleteFlowMock = (
  confirmDelete: jest.Mock = jest.fn().mockResolvedValue(false),
  error?: unknown
): ReturnType<typeof useDeleteProfileFlow> =>
  ({
    pendingProfileId: undefined,
    isDeleting: false,
    error,
    openConfirmation: jest.fn(),
    cancel: jest.fn(),
    confirmDelete,
  } as unknown as ReturnType<typeof useDeleteProfileFlow>);

const createProfileFormMock = (
  submit: jest.Mock = jest.fn().mockResolvedValue(undefined),
  submitError?: unknown,
  reset: jest.Mock = jest.fn(),
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
    setName: jest.fn(),
    setDescription: jest.fn(),
    setTargetType: jest.fn(),
    setTargetId: jest.fn(),
    setFieldRules: jest.fn(),
    setRegexRules: jest.fn(),
    setNerRules: jest.fn(),
    submit,
  } as unknown as ReturnType<typeof useProfileForm>);

describe('useAnonymizationProfilesSectionState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(createAnonymizationProfilesClient).mockReturnValue({
      findProfiles: jest.fn(),
      getProfile: jest.fn(),
      createProfile: jest.fn(),
      updateProfile: jest.fn(),
      deleteProfile: jest.fn(),
    });
    jest.mocked(useProfilesListView).mockReturnValue(createListViewMock());
    jest.mocked(useDeleteProfileFlow).mockReturnValue(createDeleteFlowMock());
    jest.mocked(useProfileForm).mockReturnValue(createProfileFormMock());
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
    jest.mocked(useProfilesListView).mockReturnValue(createListViewMock({ kind: 'forbidden' }));

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
    const onCreateSuccess = jest.fn();
    const reset = jest.fn();
    jest
      .mocked(useProfileForm)
      .mockReturnValue(
        createProfileFormMock(
          jest.fn().mockResolvedValue({ profile: { id: 'p1' } }),
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
    const onCreateConflict = jest.fn();
    const matchingProfile = {
      id: 'profile-1',
      targetType: TARGET_TYPE_INDEX,
      targetId: 'logs-1',
    } as AnonymizationProfile;
    jest.mocked(useProfilesListView).mockReturnValue({
      ...createListViewMock(undefined),
      profiles: [matchingProfile],
    });
    jest.mocked(useProfileForm).mockReturnValue(
      createProfileFormMock(
        jest.fn().mockResolvedValue({
          isConflict: true,
        }),
        undefined,
        jest.fn(),
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
    const onDeleteSuccess = jest.fn();
    jest
      .mocked(useDeleteProfileFlow)
      .mockReturnValue(createDeleteFlowMock(jest.fn().mockResolvedValue(true)));

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
    const onOpenConflictError = jest.fn();
    const getProfile = jest
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ id: 'profile-1', name: 'Profile 1' });
    jest.mocked(createAnonymizationProfilesClient).mockReturnValue({
      findProfiles: jest.fn(),
      getProfile,
      createProfile: jest.fn(),
      updateProfile: jest.fn(),
      deleteProfile: jest.fn(),
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
    const reset = jest.fn();
    jest.mocked(useProfileForm).mockReturnValue(createProfileFormMock(undefined, undefined, reset));

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
