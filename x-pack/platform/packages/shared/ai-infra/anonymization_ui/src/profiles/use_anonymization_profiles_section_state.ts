/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { AnonymizationProfile } from '@kbn/anonymization-common';
import type { AnonymizationUiServices } from '../contracts';
import { useDeleteProfileFlow } from './hooks/use_delete_profile_flow';
import { useProfileForm } from './hooks/use_profile_form';
import { useProfilesListView } from './hooks/use_profiles_list_view';
import { createAnonymizationProfilesClient } from './services/profiles/client';

export type AnonymizationMode = 'manage' | 'readOnly' | 'hidden';

interface ProfilesApiErrorLike {
  kind: string;
}

export type FlyoutState =
  | { mode: 'create' }
  | { mode: 'edit'; profile: AnonymizationProfile }
  | null;

interface UseAnonymizationProfilesSectionStateParams {
  fetch: AnonymizationUiServices['http']['fetch'];
  spaceId: string;
  canShow: boolean;
  canManage: boolean;
  onCreateSuccess?: () => void;
  onUpdateSuccess?: () => void;
  onDeleteSuccess?: () => void;
  onCreateConflict?: () => void;
  onOpenConflictError?: (error: unknown) => void;
}

const ANONYMIZATION_READ_ONLY_ERROR_KINDS = ['forbidden', 'unauthorized'] as const;

const isProfilesApiError = (error: unknown): error is ProfilesApiErrorLike =>
  typeof error === 'object' && error !== null && 'kind' in error && typeof error.kind === 'string';

const isReadOnlyApiError = (error: unknown): boolean =>
  isProfilesApiError(error) &&
  ANONYMIZATION_READ_ONLY_ERROR_KINDS.some((kind) => kind === error.kind);

export const useAnonymizationProfilesSectionState = ({
  fetch,
  spaceId,
  canShow,
  canManage,
  onCreateSuccess,
  onUpdateSuccess,
  onDeleteSuccess,
  onCreateConflict,
  onOpenConflictError,
}: UseAnonymizationProfilesSectionStateParams) => {
  const [flyoutState, setFlyoutState] = useState<FlyoutState>(null);
  const [createConflictProfileId, setCreateConflictProfileId] = useState<string | undefined>();

  const profilesClient = useMemo(() => createAnonymizationProfilesClient({ fetch }), [fetch]);
  const context = useMemo(() => ({ spaceId }), [spaceId]);
  const listView = useProfilesListView({ client: profilesClient, context });
  const deleteFlow = useDeleteProfileFlow({ client: profilesClient, context });
  const form = useProfileForm({
    client: profilesClient,
    context,
    initialProfile: flyoutState?.mode === 'edit' ? flyoutState.profile : undefined,
  });

  const effectiveMode: AnonymizationMode = useMemo(() => {
    if (!canShow) {
      return 'hidden';
    }
    if (canManage && !isReadOnlyApiError(listView.error)) {
      return 'manage';
    }
    return 'readOnly';
  }, [canManage, canShow, listView.error]);
  const hasReadOnlyApiError = isReadOnlyApiError(listView.error);
  const isManageMode = effectiveMode === 'manage';

  const closeFlyout = useCallback(() => {
    setFlyoutState(null);
    setCreateConflictProfileId(undefined);
  }, []);

  const closeDeleteModal = useCallback(() => deleteFlow.cancel(), [deleteFlow]);

  const confirmDelete = useCallback(async () => {
    const didDelete = await deleteFlow.confirmDelete();
    if (didDelete) {
      onDeleteSuccess?.();
    }
  }, [deleteFlow, onDeleteSuccess]);

  const openProfileById = useCallback(
    async (profileId: string) => {
      try {
        const profile = await profilesClient.getProfile(profileId);
        setFlyoutState({ mode: 'edit', profile });
      } catch (error) {
        onOpenConflictError?.(error);
      }
    },
    [onOpenConflictError, profilesClient]
  );

  const submitFlyout = useCallback(async () => {
    if (!flyoutState) {
      return;
    }

    const result = await form.submit();
    if (result?.profile) {
      if (flyoutState.mode === 'create') {
        setCreateConflictProfileId(undefined);
        form.reset();
        closeFlyout();
        onCreateSuccess?.();
      } else {
        closeFlyout();
        onUpdateSuccess?.();
      }
      return;
    }

    if (flyoutState.mode === 'create' && result?.isConflict) {
      setCreateConflictProfileId('conflict');
      onCreateConflict?.();
    }
  }, [closeFlyout, flyoutState, form, onCreateConflict, onCreateSuccess, onUpdateSuccess]);

  const onCreateProfile = useCallback(() => {
    setFlyoutState({ mode: 'create' });
  }, []);

  const onEditProfile = useCallback((profile: AnonymizationProfile) => {
    setFlyoutState({ mode: 'edit', profile });
  }, []);

  const onTablePageChange = useCallback(
    (page: number, size: number) => {
      listView.setPage(page);
      listView.setPerPage(size);
    },
    [listView]
  );

  return {
    listView,
    deleteFlow,
    form,
    flyoutState,
    createConflictProfileId,
    effectiveMode,
    hasReadOnlyApiError,
    isManageMode,
    closeFlyout,
    closeDeleteModal,
    confirmDelete,
    openProfileById,
    submitFlyout,
    onCreateProfile,
    onEditProfile,
    onTablePageChange,
  };
};
