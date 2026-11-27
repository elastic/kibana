/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import {
  validatePauseReasons,
  validateStatusesConfiguration,
} from '../../../../common/investigations/statuses';
import type { StatusesConfiguration } from '../../../../common/investigations/statuses';
import { useCasesContext } from '../../../components/cases_context/use_cases_context';
import {
  getHttpErrorMessage,
  getHttpErrorStatus,
  useReloadStatuses,
  useSaveStatuses,
  useStatuses,
} from '../../hooks';
import type { StatusesDraft } from './status_utils';

export interface SaveStatusesResult {
  ok: boolean;
  error?: string;
  /** The stored list changed since it was loaded; the page has to reload it. */
  isConflict?: boolean;
}

export interface StatusesEditor {
  config: StatusesConfiguration | undefined;
  isLoading: boolean;
  loadError: unknown;
  retryLoad: () => void;
  /** No Cases settings privilege, from the user's capabilities or from a 403 on save. */
  isReadOnly: boolean;
  isSaving: boolean;
  /** Checks the rules in the browser first, then saves; every failure comes back as a message. */
  save: (draft: StatusesDraft) => Promise<SaveStatusesResult>;
  reload: () => void;
}

/** Loads the statuses and saves changes with their version, showing server messages as results. */
export const useStatusesEditor = (): StatusesEditor => {
  const { permissions } = useCasesContext();
  const { data, isLoading, error, refetch } = useStatuses();
  const { mutateAsync, isLoading: isSaving } = useSaveStatuses();
  const reloadStatuses = useReloadStatuses();
  const [isForbidden, setIsForbidden] = useState(false);

  const save = useCallback(
    async (draft: StatusesDraft): Promise<SaveStatusesResult> => {
      if (!data) {
        return { ok: false };
      }
      const clientError =
        validateStatusesConfiguration(draft.statuses, data.statuses) ??
        validatePauseReasons(draft.pauseReasons, draft.statuses);
      if (clientError) {
        return { ok: false, error: clientError };
      }
      try {
        await mutateAsync({ ...draft, version: data.version });
        return { ok: true };
      } catch (saveError) {
        const status = getHttpErrorStatus(saveError);
        if (status === 403) {
          setIsForbidden(true);
        }
        return {
          ok: false,
          error: getHttpErrorMessage(saveError),
          isConflict: status === 409,
        };
      }
    },
    [data, mutateAsync]
  );

  return {
    config: data,
    isLoading,
    loadError: error,
    retryLoad: () => void refetch(),
    isReadOnly: !permissions.settings || isForbidden,
    isSaving,
    save,
    reload: () => void reloadStatuses(),
  };
};
