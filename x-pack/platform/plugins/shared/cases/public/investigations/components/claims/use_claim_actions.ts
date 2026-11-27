/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { ClaimItem, ItemPatch } from '../../../../common/investigations/types';
import { useInvestigationToasts, useUpdateItem } from '../../hooks';

/**
 * Updates a claim with its current version. Resolves to true when the change was saved. Errors
 * (including 409 conflicts) are already reported by `useUpdateItem`, so callers only need the
 * boolean to decide whether to leave an editing state.
 */
export const useClaimActions = (recordId: string) => {
  const { mutateAsync, isLoading } = useUpdateItem(recordId);
  const { showSuccess } = useInvestigationToasts();

  const patchClaim = useCallback(
    async (claim: ClaimItem, patch: ItemPatch, successMessage?: string): Promise<boolean> => {
      try {
        await mutateAsync({ itemId: claim.id, version: claim.version ?? '', patch });
      } catch {
        return false;
      }
      if (successMessage) {
        showSuccess(successMessage);
      }
      return true;
    },
    [mutateAsync, showSuccess]
  );

  return { patchClaim, isUpdating: isLoading };
};
