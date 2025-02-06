/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useCallback, useState, useEffect } from 'react';

import {
  DataStreamReindexStatus,
  DataStreamReindexWarning,
  DataStreamMetadata,
  DataStreamReindexStatusResponse,
  DataStreamProgressDetails,
  DataStreamResolutionType,
} from '../../../../../../common/types';
import { CancelLoadingState, LoadingState } from '../../../types';
import { ApiService } from '../../../../lib/api';
import { readOnlyExecute } from './readonly_state';

const POLL_INTERVAL = 1000;

export interface MigrationState {
  loadingState: LoadingState;
  cancelLoadingState?: CancelLoadingState;

  resolutionType?: DataStreamResolutionType;
  status?: DataStreamReindexStatus;
  reindexTaskPercComplete: number | null;
  errorMessage: string | null;
  reindexWarnings?: DataStreamReindexWarning[];
  hasRequiredPrivileges?: boolean;
  taskStatus?: DataStreamProgressDetails;

  meta: DataStreamMetadata | null;
}

const getReindexState = (
  migrationState: MigrationState,
  {
    reindexOp,
    warnings,
    hasRequiredPrivileges,
    meta: updatedMeta,
  }: DataStreamReindexStatusResponse & { meta?: DataStreamMetadata | null }
) => {
  const newReindexState: MigrationState = {
    ...migrationState,
    reindexWarnings: warnings,
    meta: updatedMeta || migrationState.meta,
    loadingState: LoadingState.Success,
  };

  if (warnings) {
    newReindexState.reindexWarnings = warnings;
  }

  if (hasRequiredPrivileges !== undefined) {
    newReindexState.hasRequiredPrivileges = hasRequiredPrivileges;
  }

  if (reindexOp) {
    newReindexState.status = reindexOp.status;

    if (reindexOp.status === DataStreamReindexStatus.notStarted) {
      return newReindexState;
    }

    if (reindexOp.status === DataStreamReindexStatus.failed) {
      newReindexState.errorMessage = reindexOp.errorMessage;
      return newReindexState;
    }

    if (
      reindexOp.status === DataStreamReindexStatus.inProgress ||
      reindexOp.status === DataStreamReindexStatus.completed
    ) {
      newReindexState.taskStatus = reindexOp.progressDetails;
      newReindexState.reindexTaskPercComplete = reindexOp.reindexTaskPercComplete;
    }

    if (
      migrationState.cancelLoadingState === CancelLoadingState.Requested &&
      reindexOp.status === DataStreamReindexStatus.inProgress
    ) {
      newReindexState.cancelLoadingState = CancelLoadingState.Loading;
    }
  }

  return newReindexState;
};

export const useReindexStatus = ({
  dataStreamName,
  api,
}: {
  dataStreamName: string;
  api: ApiService;
}) => {
  const [migrationState, setMigrationState] = useState<MigrationState>({
    loadingState: LoadingState.Loading,
    errorMessage: null,
    reindexTaskPercComplete: null,
    taskStatus: undefined,
    meta: null,
  });

  const pollIntervalIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readonlyState = useRef<ReturnType<typeof readOnlyExecute> | null>(null);
  const isMounted = useRef(false);

  const clearPollInterval = useCallback(() => {
    if (pollIntervalIdRef.current) {
      clearTimeout(pollIntervalIdRef.current);
      pollIntervalIdRef.current = null;
    }
  }, []);

  const pollingFunction = useCallback(
    async (resolutionType?: 'readonly' | 'reindex') => {
      clearPollInterval();
      try {
        if (resolutionType === 'readonly' && !readonlyState.current) {
          readonlyState.current = readOnlyExecute(dataStreamName, migrationState.meta, api);
        }

        let data: DataStreamReindexStatusResponse | undefined | null = null;
        let error: Error | null | undefined = null;
        if (resolutionType === 'readonly') {
          const results = await readonlyState.current?.next();

          data = results?.value.data;
          error = results?.value.error;
        } else {
          const results = await api.getDataStreamReindexStatus(dataStreamName);
          data = results.data;
          error = results.error;
        }

        if (error) {
          setMigrationState((prevValue: MigrationState) => {
            return {
              ...prevValue,
              loadingState: LoadingState.Error,
              errorMessage: error.message.toString(),
              status: DataStreamReindexStatus.fetchFailed,
            };
          });
          return;
        }

        if (!data) {
          return;
        }

        setMigrationState((prevValue: MigrationState) => {
          return getReindexState(prevValue, data);
        });

        if (data.reindexOp && data.reindexOp.status === DataStreamReindexStatus.inProgress) {
          // Only keep polling if it exists and is in progress.
          pollIntervalIdRef.current = setTimeout(
            () => pollingFunction(migrationState.resolutionType),
            POLL_INTERVAL
          );
        }
      } catch (error) {
        setMigrationState((prevValue: MigrationState) => {
          return {
            ...prevValue,
            loadingState: LoadingState.Error,
            errorMessage: error.message.toString(),
            status: DataStreamReindexStatus.fetchFailed,
          };
        });
      }
    },
    [clearPollInterval, api, dataStreamName, migrationState.meta, migrationState.resolutionType]
  );

  const updateStatus = useCallback(async () => {
    return pollingFunction(migrationState.resolutionType);
  }, [pollingFunction, migrationState.resolutionType]);

  const startReindex = useCallback(async () => {
    setMigrationState((prevValue: MigrationState) => {
      return {
        ...prevValue,
        status: DataStreamReindexStatus.inProgress,
        reindexTaskPercComplete: null,
        errorMessage: null,
        cancelLoadingState: undefined,
      };
    });

    if (migrationState.status === DataStreamReindexStatus.failed) {
      try {
        await api.cancelDataStreamReindexTask(dataStreamName);
      } catch (_) {
        // if the task has already failed, attempt to cancel the task
        // before attempting to start the reindexing again.
      }
    }

    const { data: reindexOp, error } = await api.startDataStreamReindexTask(dataStreamName);

    if (error) {
      setMigrationState((prevValue: MigrationState) => {
        return {
          ...prevValue,
          loadingState: LoadingState.Error,
          errorMessage: error.message.toString(),
          status: DataStreamReindexStatus.failed,
        };
      });
      return;
    }

    setMigrationState((prevValue: MigrationState) => {
      return getReindexState(prevValue, { reindexOp, meta: prevValue.meta });
    });
    updateStatus();
  }, [api, dataStreamName, updateStatus, migrationState.status]);

  const loadDataStreamMetadata = useCallback(async () => {
    try {
      const { data, error } = await api.getDataStreamMetadata(dataStreamName);

      if (error) {
        throw error;
      }

      setMigrationState((prevValue: MigrationState) => {
        return {
          ...prevValue,
          loadingState: LoadingState.Success,
          meta: data || null,
        };
      });
    } catch (error) {
      setMigrationState((prevValue: MigrationState) => {
        // if state is completed, we don't need to update the meta
        if (prevValue.status === DataStreamReindexStatus.completed) {
          return prevValue;
        }

        return {
          ...prevValue,
          loadingState: LoadingState.Error,
          errorMessage: error.message.toString(),
          status: DataStreamReindexStatus.failed,
        };
      });
    }
  }, [api, dataStreamName]);

  const cancelReindex = useCallback(async () => {
    setMigrationState((prevValue: MigrationState) => {
      return {
        ...prevValue,
        cancelLoadingState: CancelLoadingState.Requested,
      };
    });
    try {
      const { error } = await api.cancelDataStreamReindexTask(dataStreamName);

      if (error) {
        throw error;
      }

      setMigrationState((prevValue: MigrationState) => {
        return {
          ...prevValue,
          cancelLoadingState: CancelLoadingState.Success,
          status: DataStreamReindexStatus.cancelled,
        };
      });
    } catch (error) {
      setMigrationState((prevValue: MigrationState) => {
        return {
          ...prevValue,
          cancelLoadingState: CancelLoadingState.Error,
        };
      });
    }
  }, [api, dataStreamName]);

  const startReadonly = useCallback(async () => {
    /**
     * Here we jsut mark the status as in progress for the polling function
     * to start executing the reindexing.
     */
    setMigrationState((prevValue: MigrationState) => {
      return {
        ...prevValue,
        resolutionType: 'readonly',
        status: DataStreamReindexStatus.inProgress,
        reindexTaskPercComplete: null,
      };
    });

    readonlyState.current = readOnlyExecute(dataStreamName, migrationState.meta, api);

    pollingFunction('readonly');
  }, [api, dataStreamName, migrationState, pollingFunction]);

  const cancelReadonly = useCallback(async () => {
    readonlyState.current = null;
    setMigrationState((prevValue: MigrationState) => {
      return {
        ...prevValue,
        resolutionType: undefined,
        cancelLoadingState: CancelLoadingState.Success,
        status: DataStreamReindexStatus.cancelled,
      };
    });
  }, []);

  useEffect(() => {
    updateStatus();
  }, [updateStatus]);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;

      // Clean up on unmount.
      clearPollInterval();
    };
  }, [clearPollInterval]);

  return {
    migrationState,
    loadDataStreamMetadata,

    startReindex,
    cancelReindex,
    updateStatus,

    startReadonly,
    cancelReadonly,
  };
};
