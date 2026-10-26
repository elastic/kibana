/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import {
  NER_MODEL_ID,
  GLOBAL_ANONYMIZATION_PROFILE_TARGET_ID,
  type AnonymizationProfile,
} from '@kbn/anonymization-common';
import { mapProfilesApiError } from '../services/profiles/errors';
import { getConflictState } from '../services/profiles/hooks/get_conflict_state';
import { useCreateProfile } from '../services/profiles/hooks/use_create_profile';
import { useUpdateProfile } from '../services/profiles/hooks/use_update_profile';
import { TARGET_TYPE_DATA_VIEW, TARGET_TYPE_INDEX } from '../target_types';
import { useProfileForm } from './use_profile_form';

jest.mock('../services/profiles/hooks/use_create_profile', () => ({
  useCreateProfile: jest.fn(),
}));
jest.mock('../services/profiles/hooks/use_update_profile', () => ({
  useUpdateProfile: jest.fn(),
}));
jest.mock('../services/profiles/hooks/get_conflict_state', () => ({
  getConflictState: jest.fn(),
}));

const createUseCreateProfileMutationMock = ({
  mutateAsync = jest.fn(),
  error = null,
  isLoading = false,
  reset = jest.fn(),
}: {
  mutateAsync?: jest.Mock;
  error?: unknown;
  isLoading?: boolean;
  reset?: jest.Mock;
} = {}): ReturnType<typeof useCreateProfile> =>
  ({
    mutateAsync,
    error,
    isLoading,
    reset,
  } as unknown as ReturnType<typeof useCreateProfile>);

const createUseUpdateProfileMutationMock = ({
  mutateAsync = jest.fn(),
  error = null,
  isLoading = false,
  reset = jest.fn(),
}: {
  mutateAsync?: jest.Mock;
  error?: unknown;
  isLoading?: boolean;
  reset?: jest.Mock;
} = {}): ReturnType<typeof useUpdateProfile> =>
  ({
    mutateAsync,
    error,
    isLoading,
    reset,
  } as unknown as ReturnType<typeof useUpdateProfile>);

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

describe('useProfileForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getConflictState).mockReturnValue({ isConflict: false, error: undefined });
  });

  it('validates required fields before submit', async () => {
    const mutateAsync = jest.fn();
    jest
      .mocked(useCreateProfile)
      .mockReturnValue(createUseCreateProfileMutationMock({ mutateAsync }));
    jest.mocked(useUpdateProfile).mockReturnValue(createUseUpdateProfileMutationMock());

    const { result } = renderHook(() =>
      useProfileForm({
        client,
        context: { spaceId: 'default' },
      })
    );

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.validationErrors.name).toBe('Profile name is required');
    expect(result.current.validationErrors.targetId).toBe('Target identifier is required');
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('requires entity class when anonymized field is empty', async () => {
    const mutateAsync = jest.fn();
    jest
      .mocked(useCreateProfile)
      .mockReturnValue(createUseCreateProfileMutationMock({ mutateAsync }));
    jest.mocked(useUpdateProfile).mockReturnValue(createUseUpdateProfileMutationMock());

    const { result } = renderHook(() =>
      useProfileForm({
        client,
        context: { spaceId: 'default' },
      })
    );

    act(() => {
      result.current.setName('My Profile');
      result.current.setTargetType(TARGET_TYPE_INDEX);
      result.current.setTargetId('logs-foo');
      result.current.setFieldRules([
        {
          field: 'host.name',
          allowed: true,
          anonymized: true,
          entityClass: '',
        } as unknown as Parameters<typeof result.current.setFieldRules>[0][number],
      ]);
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.validationErrors.fieldRules).toBe(
      'Entity class is required for anonymized fields'
    );
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('requires regex pattern and entity class for regex rules', async () => {
    const mutateAsync = jest.fn();
    jest
      .mocked(useCreateProfile)
      .mockReturnValue(createUseCreateProfileMutationMock({ mutateAsync }));
    jest.mocked(useUpdateProfile).mockReturnValue(createUseUpdateProfileMutationMock());

    const { result } = renderHook(() =>
      useProfileForm({
        client,
        context: { spaceId: 'default' },
      })
    );

    act(() => {
      result.current.setName('My Profile');
      result.current.setTargetType(TARGET_TYPE_INDEX);
      result.current.setTargetId('logs-foo');
      result.current.setRegexRules([
        {
          id: 'regex-1',
          type: 'regex',
          pattern: '',
          entityClass: '',
          enabled: true,
        } as unknown as Parameters<typeof result.current.setRegexRules>[0][number],
      ]);
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.validationErrors.regexRules).toBe(
      'Regex pattern and entity class are required for regex rules'
    );
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('requires ner model id and allowed entities for ner rules', async () => {
    const mutateAsync = jest.fn();
    jest
      .mocked(useCreateProfile)
      .mockReturnValue(createUseCreateProfileMutationMock({ mutateAsync }));
    jest.mocked(useUpdateProfile).mockReturnValue(createUseUpdateProfileMutationMock());

    const { result } = renderHook(() =>
      useProfileForm({
        client,
        context: { spaceId: 'default' },
      })
    );

    act(() => {
      result.current.setName('My Profile');
      result.current.setTargetType(TARGET_TYPE_INDEX);
      result.current.setTargetId('logs-foo');
      result.current.setNerRules([
        {
          id: 'ner-1',
          type: 'ner',
          modelId: 'model-1',
          allowedEntityClasses: [],
          enabled: true,
        },
      ]);
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.validationErrors.nerRules).toBe(
      'NER model id is required and allowed entities must be selected from PER, ORG, LOC, MISC.'
    );
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('submits create form values through create mutation', async () => {
    const created = createProfile('new');
    const createMutateAsync = jest.fn().mockResolvedValue(created);
    jest
      .mocked(useCreateProfile)
      .mockReturnValue(createUseCreateProfileMutationMock({ mutateAsync: createMutateAsync }));
    jest.mocked(useUpdateProfile).mockReturnValue(createUseUpdateProfileMutationMock());

    const { result } = renderHook(() =>
      useProfileForm({
        client,
        context: { spaceId: 'default' },
      })
    );

    act(() => {
      result.current.setName('My Profile');
      result.current.setDescription('My profile description');
      result.current.setTargetType(TARGET_TYPE_DATA_VIEW);
      result.current.setTargetId('dv-1');
    });

    await act(async () => {
      const submitResult = await result.current.submit();
      expect(submitResult?.profile).toEqual(created);
    });

    expect(createMutateAsync).toHaveBeenCalledWith({
      name: 'My Profile',
      description: 'My profile description',
      targetType: TARGET_TYPE_DATA_VIEW,
      targetId: 'dv-1',
      rules: { fieldRules: [], regexRules: [], nerRules: [] },
    });
  });

  it('uses update mutation in edit mode', async () => {
    const initialProfile = createProfile('existing');
    const updated = { ...initialProfile, name: 'Updated Name' };
    const updateMutateAsync = jest.fn().mockResolvedValue(updated);
    jest.mocked(useCreateProfile).mockReturnValue(createUseCreateProfileMutationMock());
    jest
      .mocked(useUpdateProfile)
      .mockReturnValue(createUseUpdateProfileMutationMock({ mutateAsync: updateMutateAsync }));

    const { result } = renderHook(() =>
      useProfileForm({
        client,
        context: { spaceId: 'default' },
        initialProfile,
      })
    );

    act(() => {
      result.current.setName('Updated Name');
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(updateMutateAsync).toHaveBeenCalledWith({
      id: 'existing',
      name: 'Updated Name',
      description: undefined,
      rules: initialProfile.rules,
    });
  });

  it('returns conflict state when submit fails with conflict', async () => {
    const createError = mapProfilesApiError({
      statusCode: 409,
      body: { message: 'profile already exists' },
    });
    const createMutateAsync = jest.fn().mockRejectedValue(createError);
    jest.mocked(useCreateProfile).mockReturnValue(
      createUseCreateProfileMutationMock({
        mutateAsync: createMutateAsync,
        error: createError,
      })
    );
    jest.mocked(useUpdateProfile).mockReturnValue(createUseUpdateProfileMutationMock());
    jest.mocked(getConflictState).mockReturnValue({
      isConflict: true,
      error: createError,
    });

    const { result } = renderHook(() =>
      useProfileForm({
        client,
        context: { spaceId: 'default' },
      })
    );

    act(() => {
      result.current.setName('My Profile');
      result.current.setTargetType(TARGET_TYPE_DATA_VIEW);
      result.current.setTargetId('dv-1');
    });

    await act(async () => {
      const submitResult = await result.current.submit();
      expect(submitResult?.profile).toBeUndefined();
      expect(submitResult?.isConflict).toBe(true);
    });
  });

  it('returns undefined when submit fails without conflict details', async () => {
    const createMutateAsync = jest.fn().mockRejectedValue(new Error('boom'));
    jest.mocked(useCreateProfile).mockReturnValue(
      createUseCreateProfileMutationMock({
        mutateAsync: createMutateAsync,
      })
    );
    jest.mocked(useUpdateProfile).mockReturnValue(createUseUpdateProfileMutationMock());
    jest.mocked(getConflictState).mockReturnValue({ isConflict: false, error: undefined });

    const { result } = renderHook(() =>
      useProfileForm({
        client,
        context: { spaceId: 'default' },
      })
    );

    act(() => {
      result.current.setName('My Profile');
      result.current.setTargetType(TARGET_TYPE_DATA_VIEW);
      result.current.setTargetId('dv-1');
    });

    await act(async () => {
      const submitResult = await result.current.submit();
      expect(submitResult).toBeUndefined();
    });
  });

  it('falls back to normalized conflict detection when conflict state helper does not classify error', async () => {
    const createError = mapProfilesApiError({
      statusCode: 409,
      body: { message: 'profile already exists' },
    });
    const createMutateAsync = jest.fn().mockRejectedValue(createError);
    jest.mocked(useCreateProfile).mockReturnValue(
      createUseCreateProfileMutationMock({
        mutateAsync: createMutateAsync,
        error: createError,
      })
    );
    jest.mocked(useUpdateProfile).mockReturnValue(createUseUpdateProfileMutationMock());
    jest.mocked(getConflictState).mockReturnValue({ isConflict: false, error: undefined });

    const { result } = renderHook(() =>
      useProfileForm({
        client,
        context: { spaceId: 'default' },
      })
    );

    act(() => {
      result.current.setName('My Profile');
      result.current.setTargetType(TARGET_TYPE_DATA_VIEW);
      result.current.setTargetId('dv-1');
    });

    await act(async () => {
      const submitResult = await result.current.submit();
      expect(submitResult?.isConflict).toBe(true);
    });
  });

  it('normalizes non-API submit errors for display', () => {
    jest.mocked(useCreateProfile).mockReturnValue(
      createUseCreateProfileMutationMock({
        error: new Error('invalid profile response payload'),
      })
    );
    jest.mocked(useUpdateProfile).mockReturnValue(createUseUpdateProfileMutationMock());

    const { result } = renderHook(() =>
      useProfileForm({
        client,
        context: { spaceId: 'default' },
      })
    );

    expect(result.current.submitError?.kind).toBe('unknown');
    expect(result.current.submitError?.message).toBe('invalid profile response payload');
  });

  it('clears mutation error state on reset', () => {
    let createError: unknown = new Error('invalid profile response payload');
    const createReset = jest.fn(() => {
      createError = null;
    });
    const updateReset = jest.fn();

    jest.mocked(useCreateProfile).mockImplementation(() =>
      createUseCreateProfileMutationMock({
        error: createError,
        reset: createReset,
      })
    );
    jest.mocked(useUpdateProfile).mockImplementation(() =>
      createUseUpdateProfileMutationMock({
        reset: updateReset,
      })
    );

    const { result } = renderHook(() =>
      useProfileForm({
        client,
        context: { spaceId: 'default' },
      })
    );

    expect(result.current.submitError?.message).toBe('invalid profile response payload');

    act(() => {
      result.current.reset();
    });

    expect(createReset).toHaveBeenCalled();
    expect(updateReset).toHaveBeenCalled();
    expect(result.current.submitError).toBeUndefined();
  });

  it('hydrates form values when initialProfile arrives after mount', async () => {
    jest.mocked(useCreateProfile).mockReturnValue(createUseCreateProfileMutationMock());
    jest.mocked(useUpdateProfile).mockReturnValue(createUseUpdateProfileMutationMock());

    const initialProps: { initialProfile?: AnonymizationProfile } = {
      initialProfile: undefined,
    };

    const { result, rerender } = renderHook(
      ({ initialProfile }: { initialProfile?: AnonymizationProfile }) =>
        useProfileForm({
          client,
          context: { spaceId: 'default' },
          initialProfile,
        }),
      { initialProps }
    );

    expect(result.current.isEdit).toBe(false);
    expect(result.current.values.name).toBe('');

    const hydrated = createProfile('late');
    rerender({ initialProfile: hydrated });

    await waitFor(() => {
      expect(result.current.isEdit).toBe(true);
      expect(result.current.values.name).toBe('profile-late');
      expect(result.current.values.targetType).toBe(TARGET_TYPE_INDEX);
      expect(result.current.values.targetId).toBe('logs-late');
    });
  });

  it('clears target selection and rules when target type changes', () => {
    jest.mocked(useCreateProfile).mockReturnValue(createUseCreateProfileMutationMock());
    jest.mocked(useUpdateProfile).mockReturnValue(createUseUpdateProfileMutationMock());

    const { result } = renderHook(() =>
      useProfileForm({
        client,
        context: { spaceId: 'default' },
      })
    );

    act(() => {
      result.current.setTargetId('logs-index');
      result.current.setFieldRules([{ field: 'host.name', allowed: true, anonymized: false }]);
      result.current.setRegexRules([
        {
          id: 'regex-1',
          type: 'regex',
          entityClass: 'EMAIL',
          pattern: '.*',
          enabled: true,
        },
      ]);
      result.current.setNerRules([
        {
          id: 'ner-1',
          type: 'ner',
          modelId: 'model-1',
          allowedEntityClasses: ['PER'],
          enabled: true,
        },
      ]);
    });

    act(() => {
      result.current.setTargetType(TARGET_TYPE_DATA_VIEW);
    });

    expect(result.current.values.targetType).toBe(TARGET_TYPE_DATA_VIEW);
    expect(result.current.values.targetId).toBe('');
    expect(result.current.values.fieldRules).toEqual([]);
    expect(result.current.values.regexRules).toEqual([]);
    expect(result.current.values.nerRules).toEqual([]);
  });

  it('normalizes missing NER modelId to default constant when hydrating initial profile', async () => {
    jest.mocked(useCreateProfile).mockReturnValue(createUseCreateProfileMutationMock());
    jest.mocked(useUpdateProfile).mockReturnValue(createUseUpdateProfileMutationMock());

    const profileWithLegacyNer = {
      ...createProfile('legacy'),
      rules: {
        fieldRules: [],
        regexRules: [],
        nerRules: [
          {
            id: 'ner-legacy',
            type: 'ner',
            modelId: undefined,
            allowedEntityClasses: ['PER'],
            enabled: true,
          },
        ],
      },
    } as unknown as AnonymizationProfile;

    const { result } = renderHook(() =>
      useProfileForm({
        client,
        context: { spaceId: 'default' },
        initialProfile: profileWithLegacyNer,
      })
    );

    await waitFor(() => {
      expect(result.current.values.nerRules[0].modelId).toBe(NER_MODEL_ID);
    });
  });

  it('submits global profile updates without field rules', async () => {
    const initialProfile = {
      ...createProfile('global'),
      targetType: TARGET_TYPE_INDEX,
      targetId: GLOBAL_ANONYMIZATION_PROFILE_TARGET_ID,
      rules: {
        fieldRules: [{ field: 'user.name', allowed: true, anonymized: false }],
        regexRules: [],
        nerRules: [],
      },
    };
    const updateMutateAsync = jest.fn().mockResolvedValue(initialProfile);
    jest.mocked(useCreateProfile).mockReturnValue(createUseCreateProfileMutationMock());
    jest
      .mocked(useUpdateProfile)
      .mockReturnValue(createUseUpdateProfileMutationMock({ mutateAsync: updateMutateAsync }));

    const { result } = renderHook(() =>
      useProfileForm({
        client,
        context: { spaceId: 'default' },
        initialProfile,
      })
    );

    act(() => {
      result.current.setName('Global Profile');
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(updateMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        rules: {
          fieldRules: [],
          regexRules: [],
          nerRules: [],
        },
      })
    );
  });
});
