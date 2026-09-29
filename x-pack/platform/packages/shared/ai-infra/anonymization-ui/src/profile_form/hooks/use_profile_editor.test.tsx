/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { act, renderHook, waitFor } from '@testing-library/react';
import type { AnonymizationProfile } from '@kbn/anonymization-common';
import { TARGET_TYPE_INDEX } from '../../common/target_types';
import { useProfileForm } from '../../common/hooks/use_profile_form';
import { useProfileEditor } from './use_profile_editor';

vi.mock('../../common/hooks/use_profile_form', () => {
  const mocked = {
    useProfileForm: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const baseFormController = {
  values: {
    name: '',
    description: '',
    targetType: TARGET_TYPE_INDEX,
    targetId: '',
    fieldRules: [],
    regexRules: [],
    nerRules: [],
  },
  validationErrors: {},
  submitError: undefined,
  isSubmitting: false,
  isEdit: false,
  reset: vi.fn(),
  setName: vi.fn(),
  setDescription: vi.fn(),
  setTargetType: vi.fn(),
  setTargetId: vi.fn(),
  setFieldRules: vi.fn(),
  setRegexRules: vi.fn(),
  setNerRules: vi.fn(),
  submit: vi.fn(),
};

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

const createClient = () => ({
  findProfiles: vi.fn(),
  getProfile: vi.fn(),
  createProfile: vi.fn(),
  updateProfile: vi.fn(),
  deleteProfile: vi.fn(),
});

describe('useProfileEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useProfileForm).mockReturnValue(
      baseFormController as ReturnType<typeof useProfileForm>
    );
  });

  it('loads profile on mount when profileId is provided', async () => {
    const profile = createProfile('existing');
    const client = createClient();
    client.getProfile.mockResolvedValue(profile);

    const { result } = renderHook(() =>
      useProfileEditor({
        client,
        context: { spaceId: 'default' },
        profileId: profile.id,
      })
    );

    expect(result.current.isLoadingProfile).toBe(true);

    await waitFor(() => {
      expect(client.getProfile).toHaveBeenCalledWith(profile.id);
      expect(result.current.profile).toEqual(profile);
      expect(result.current.isLoadingProfile).toBe(false);
    });

    expect(useProfileForm).toHaveBeenLastCalledWith({
      client,
      context: { spaceId: 'default' },
      initialProfile: profile,
    });
  });

  it('exposes normalized load error when loading fails', async () => {
    const client = createClient();
    client.getProfile.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() =>
      useProfileEditor({
        client,
        context: { spaceId: 'default' },
        profileId: 'missing',
      })
    );

    await waitFor(() => {
      expect(result.current.isLoadingProfile).toBe(false);
      expect(result.current.loadError?.kind).toBe('unknown');
      expect(result.current.loadError?.message).toBe('boom');
    });
  });

  it('allows manually loading another profile id', async () => {
    const secondProfile = createProfile('second');
    const client = createClient();

    const { result } = renderHook(() =>
      useProfileEditor({
        client,
        context: { spaceId: 'default' },
      })
    );

    await act(async () => {
      client.getProfile.mockResolvedValueOnce(secondProfile);
      await result.current.loadProfileById(secondProfile.id);
    });

    expect(result.current.profile).toEqual(secondProfile);
    expect(client.getProfile).toHaveBeenCalledWith(secondProfile.id);
  });
});
