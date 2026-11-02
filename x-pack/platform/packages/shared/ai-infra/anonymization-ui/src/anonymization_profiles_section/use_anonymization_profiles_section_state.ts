/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AnonymizationProfile } from '@kbn/anonymization-common';
import type { AnonymizationUiServices } from '../contracts';
import { createAnonymizationProfilesClient } from '../common/services/profiles/client';
import { useDeleteProfileFlow } from './hooks/use_delete_profile_flow';
import { useProfileForm } from '../common/hooks/use_profile_form';
import { useProfilesListView } from './hooks/use_profiles_list_view';
import type { DeleteProfileFlowController } from './hooks/use_delete_profile_flow';
import type { ProfileFormController } from '../common/hooks/use_profile_form';
import type { ProfilesListViewController } from './hooks/use_profiles_list_view';

export type AnonymizationMode = 'manage' | 'readOnly' | 'hidden';

interface ProfilesApiErrorLike {
  kind: string;
}

interface CreateConflictState {
  profileId?: string;
  targetKey: string;
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

export interface AnonymizationProfilesSectionState {
  listView: ProfilesListViewController;
  deleteFlow: DeleteProfileFlowController;
  form: ProfileFormController;
  flyoutState: FlyoutState;
  createConflictProfileId?: string;
  hasCreateConflict: boolean;
  effectiveMode: AnonymizationMode;
  hasReadOnlyApiError: boolean;
  isManageMode: boolean;
  closeFlyout: () => void;
  closeDeleteModal: () => void;
  confirmDelete: () => Promise<void>;
  openProfileById: (profileId: string) => Promise<void>;
  submitFlyout: () => Promise<void>;
  onCreateProfile: () => void;
  onEditProfile: (profile: AnonymizationProfile) => void;
  onTablePageChange: (page: number, size: number) => void;
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
}: UseAnonymizationProfilesSectionStateParams): AnonymizationProfilesSectionState => {
  const [flyoutState, setFlyoutState] = useState<FlyoutState>(null);
  const [createConflict, setCreateConflict] = useState<CreateConflictState | null>(null);

  const profilesClient = useMemo(() => createAnonymizationProfilesClient({ fetch }), [fetch]);
  const context = useMemo(() => ({ spaceId }), [spaceId]);
  const listView = useProfilesListView({ client: profilesClient, context, enabled: canShow });
  const deleteFlow = useDeleteProfileFlow({ client: profilesClient, context });
  const form = useProfileForm({
    client: profilesClient,
    context,
    initialProfile: flyoutState?.mode === 'edit' ? flyoutState.profile : undefined,
  });
  const trimmedTargetId = form.values.targetId.trim();
  const currentTargetKey = `${form.values.targetType}:${trimmedTargetId}`;

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

  useEffect(() => {
    if (createConflict && createConflict.targetKey !== currentTargetKey) {
      setCreateConflict(null);
    }
  }, [createConflict, currentTargetKey]);

  const closeFlyout = useCallback(() => {
    form.reset();
    setFlyoutState(null);
    setCreateConflict(null);
  }, [form]);

  const closeDeleteModal = useCallback(() => deleteFlow.cancel(), [deleteFlow]);

  const confirmDelete = useCallback(async () => {
    const didDelete = await deleteFlow.confirmDelete();
    if (didDelete) {
      onDeleteSuccess?.();
    }
  }, [deleteFlow, onDeleteSuccess]);

  const openProfileById = useCallback(
    async (profileId: string) => {
      setCreateConflict(null);
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
        setCreateConflict(null);
        closeFlyout();
        onCreateSuccess?.();
      } else {
        closeFlyout();
        onUpdateSuccess?.();
      }
      return;
    }

    if (flyoutState.mode === 'create' && result?.isConflict) {
      const matchingProfile = listView.profiles.find(
        (profile) =>
          profile.targetType === form.values.targetType && profile.targetId === trimmedTargetId
      );
      let conflictProfileId = matchingProfile?.id;
      if (!conflictProfileId && trimmedTargetId) {
        try {
          const response = await profilesClient.findProfiles({
            targetType: form.values.targetType,
            targetId: trimmedTargetId,
            page: 1,
            perPage: 1,
          });
          conflictProfileId = response.data[0]?.id;
        } catch {
          conflictProfileId = undefined;
        }
      }
      setCreateConflict({ profileId: conflictProfileId, targetKey: currentTargetKey });
      onCreateConflict?.();
    }
  }, [
    closeFlyout,
    currentTargetKey,
    flyoutState,
    form,
    listView.profiles,
    onCreateConflict,
    onCreateSuccess,
    onUpdateSuccess,
    profilesClient,
    trimmedTargetId,
  ]);

  const onCreateProfile = useCallback(() => {
    setCreateConflict(null);
    setFlyoutState({ mode: 'create' });
  }, []);

  const onEditProfile = useCallback((profile: AnonymizationProfile) => {
    setCreateConflict(null);
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
    createConflictProfileId: createConflict?.profileId,
    hasCreateConflict: Boolean(createConflict),
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
