/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useState } from 'react';
import type { ChangeHistoryError } from '../types/change_history_error';
import type { RestoreChangeParams } from '../types/restore_change_params';
import { useChangeHistoryConfig } from '../provider/use_change_history_config';
import { useChangeHistoryInternalConfig } from '../provider/use_change_history_internal_config';
import { mapChangeHistoryRestoreError } from '../utils/map_change_history_restore_error';

export interface UseChangeHistoryRestoreResult {
  canRestore: boolean;
  isRestoring: boolean;
  error?: ChangeHistoryError;
  clearError: () => void;
  restoreChange: (params: RestoreChangeParams) => Promise<boolean>;
}

export const useChangeHistoryRestore = (): UseChangeHistoryRestoreResult => {
  const { adapter, supports } = useChangeHistoryConfig();
  const { refetchList, setListRefreshPending } = useChangeHistoryInternalConfig();
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<ChangeHistoryError | undefined>();
  const abortControllerRef = useRef<AbortController | undefined>();

  const clearError = useCallback(() => {
    setError(undefined);
  }, []);

  const restoreChange = useCallback(
    async (params: RestoreChangeParams): Promise<boolean> => {
      if (!supports.restore || !adapter.restoreChange) {
        return false;
      }

      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsRestoring(true);
      setError(undefined);
      setListRefreshPending(true);

      try {
        await adapter.restoreChange({
          ...params,
          signal: params.signal ?? abortController.signal,
        });

        if (abortController.signal.aborted) {
          return false;
        }

        await refetchList();

        if (abortController.signal.aborted) {
          return false;
        }

        return true;
      } catch (restoreError) {
        if (abortController.signal.aborted) {
          return false;
        }

        setError(mapChangeHistoryRestoreError(restoreError));
        return false;
      } finally {
        setListRefreshPending(false);
        if (!abortController.signal.aborted) {
          setIsRestoring(false);
        }
      }
    },
    [adapter, refetchList, setListRefreshPending, supports.restore]
  );

  return {
    canRestore: supports.restore,
    isRestoring,
    error,
    clearError,
    restoreChange,
  };
};
