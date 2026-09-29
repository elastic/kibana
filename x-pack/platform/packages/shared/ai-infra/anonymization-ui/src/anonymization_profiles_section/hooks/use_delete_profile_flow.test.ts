/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { act, renderHook } from '@testing-library/react';
import { mapProfilesApiError } from '../../common/services/profiles/errors';
import { useDeleteProfile } from '../../common/services/profiles/hooks/use_delete_profile';
import { useDeleteProfileFlow } from './use_delete_profile_flow';

vi.mock('../../common/services/profiles/hooks/use_delete_profile', () => {
  const mocked = {
    useDeleteProfile: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const createDeleteProfileMutationMock = ({
  mutateAsync = vi.fn(),
  isLoading = false,
  error = null,
  reset = vi.fn(),
}: {
  mutateAsync?: Mock;
  isLoading?: boolean;
  error?: unknown;
  reset?: Mock;
} = {}): ReturnType<typeof useDeleteProfile> =>
  ({
    mutateAsync,
    isLoading,
    error,
    reset,
  } as unknown as ReturnType<typeof useDeleteProfile>);

const client = {
  findProfiles: vi.fn(),
  getProfile: vi.fn(),
  createProfile: vi.fn(),
  updateProfile: vi.fn(),
  deleteProfile: vi.fn(),
};

describe('useDeleteProfileFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens and cancels confirmation state', () => {
    const reset = vi.fn();
    vi.mocked(useDeleteProfile).mockReturnValue(createDeleteProfileMutationMock({ reset }));

    const { result } = renderHook(() =>
      useDeleteProfileFlow({
        client,
        context: { spaceId: 'default' },
      })
    );

    act(() => {
      result.current.openConfirmation('profile-1');
    });
    expect(reset).toHaveBeenCalledTimes(1);
    expect(result.current.pendingProfileId).toBe('profile-1');

    act(() => {
      result.current.cancel();
    });
    expect(result.current.pendingProfileId).toBeUndefined();
  });

  it('deletes selected profile and clears pending id on success', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ deleted: true });
    vi.mocked(useDeleteProfile).mockReturnValue(
      createDeleteProfileMutationMock({
        mutateAsync,
      })
    );

    const { result } = renderHook(() =>
      useDeleteProfileFlow({
        client,
        context: { spaceId: 'default' },
      })
    );

    act(() => {
      result.current.openConfirmation('profile-2');
    });

    await act(async () => {
      const didDelete = await result.current.confirmDelete();
      expect(didDelete).toBe(true);
    });

    expect(mutateAsync).toHaveBeenCalledWith('profile-2');
    expect(result.current.pendingProfileId).toBeUndefined();
  });

  it('keeps pending id on delete failure', async () => {
    const mutateAsync = vi.fn().mockRejectedValue(new Error('delete failed'));
    vi.mocked(useDeleteProfile).mockReturnValue(
      createDeleteProfileMutationMock({
        mutateAsync,
      })
    );

    const { result } = renderHook(() =>
      useDeleteProfileFlow({
        client,
        context: { spaceId: 'default' },
      })
    );

    act(() => {
      result.current.openConfirmation('profile-3');
    });

    await act(async () => {
      const didDelete = await result.current.confirmDelete();
      expect(didDelete).toBe(false);
    });

    expect(result.current.pendingProfileId).toBe('profile-3');
  });

  it('normalizes non-API mutation errors for display', () => {
    vi.mocked(useDeleteProfile).mockReturnValue(
      createDeleteProfileMutationMock({
        error: new Error('adapter failure'),
      })
    );

    const { result } = renderHook(() =>
      useDeleteProfileFlow({
        client,
        context: { spaceId: 'default' },
      })
    );

    expect(result.current.error?.kind).toBe('unknown');
    expect(result.current.error?.message).toBe('adapter failure');
  });

  it('preserves mapped API errors from delete mutation', () => {
    vi.mocked(useDeleteProfile).mockReturnValue(
      createDeleteProfileMutationMock({
        error: mapProfilesApiError({ statusCode: 403 }),
      })
    );

    const { result } = renderHook(() =>
      useDeleteProfileFlow({
        client,
        context: { spaceId: 'default' },
      })
    );

    expect(result.current.error?.kind).toBe('forbidden');
  });
});
