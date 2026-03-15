/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { AnonymizationProfilesClient } from '../../common/services/profiles/client';
import { ensureProfilesApiError } from '../../common/services/profiles/errors';
import type { ProfilesApiError } from '../../common/services/profiles/errors';
import { useDeleteProfile } from '../../common/services/profiles/hooks/use_delete_profile';
import type { ProfilesQueryContext } from '../../common/types/profiles';

interface UseDeleteProfileFlowParams {
  client: AnonymizationProfilesClient;
  context: ProfilesQueryContext;
}

export interface DeleteProfileFlowController {
  pendingProfileId?: string;
  isDeleting: boolean;
  error?: ProfilesApiError;
  openConfirmation: (profileId: string) => void;
  cancel: () => void;
  confirmDelete: () => Promise<boolean>;
}

export const useDeleteProfileFlow = ({
  client,
  context,
}: UseDeleteProfileFlowParams): DeleteProfileFlowController => {
  const [pendingProfileId, setPendingProfileId] = useState<string | undefined>();

  const {
    mutateAsync,
    isLoading,
    error: mutationError,
    reset,
  } = useDeleteProfile({ client, context });

  const error: ProfilesApiError | undefined = useMemo(
    () =>
      mutationError
        ? ensureProfilesApiError(mutationError, 'Unable to delete anonymization profile')
        : undefined,
    [mutationError]
  );

  const openConfirmation = useCallback(
    (profileId: string) => {
      reset();
      setPendingProfileId(profileId);
    },
    [reset]
  );

  const cancel = useCallback(() => setPendingProfileId(undefined), []);

  const confirmDelete = useCallback(async () => {
    if (!pendingProfileId) {
      return false;
    }

    try {
      await mutateAsync(pendingProfileId);
      setPendingProfileId(undefined);
      return true;
    } catch {
      return false;
    }
  }, [pendingProfileId, mutateAsync]);

  return useMemo(
    () => ({
      pendingProfileId,
      isDeleting: isLoading,
      error,
      openConfirmation,
      cancel,
      confirmDelete,
    }),
    [pendingProfileId, isLoading, error, openConfirmation, cancel, confirmDelete]
  );
};
