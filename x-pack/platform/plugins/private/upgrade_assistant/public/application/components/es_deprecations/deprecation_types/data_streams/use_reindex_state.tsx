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
} from '../../../../../../common/types';
import { CancelLoadingState, LoadingState } from '../../../types';
import { ApiService } from '../../../../lib/api';
import { readOnlyExecute } from './readonly_state';

const POLL_INTERVAL = 1000;

export interface ReindexState {
  loadingState: LoadingState;
  cancelLoadingState?: CancelLoadingState;

  resolutionType?: 'reindex' | 'readonly';
  status?: DataStreamReindexStatus;
  reindexTaskPercComplete: number | null;
  errorMessage: string | null;
  reindexWarnings?: DataStreamReindexWarning[];
  hasRequiredPrivileges?: boolean;
  taskStatus?: DataStreamProgressDetails;

  meta: DataStreamMetadata | null;
}

const getReindexState = (
  reindexState: ReindexState,
  {
    reindexOp,
    warnings,
    hasRequiredPrivileges,
    meta: updatedMeta,
  }: DataStreamReindexStatusResponse & { meta?: DataStreamMetadata | null }
) => {
  const newReindexState: ReindexState = {
    ...reindexState,
    reindexWarnings: warnings,
    meta: updatedMeta || reindexState.meta,
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
      reindexState.cancelLoadingState === CancelLoadingState.Requested &&
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
  const [reindexState, setReindexState] = useState<ReindexState>({
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
          readonlyState.current = readOnlyExecute(dataStreamName, reindexState.meta, api);
        }

        let data;
        let error;
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
          setReindexState((prevValue: ReindexState) => {
            return {
              ...prevValue,
              loadingState: LoadingState.Error,
              errorMessage: error.message.toString(),
              status: DataStreamReindexStatus.fetchFailed,
            };
          });
          return;
        }

        if (data === null) {
          return;
        }

        setReindexState((prevValue: ReindexState) => {
          return getReindexState(prevValue, data);
        });

        if (data.reindexOp && data.reindexOp.status === DataStreamReindexStatus.inProgress) {
          // Only keep polling if it exists and is in progress.
          pollIntervalIdRef.current = setTimeout(updateStatus, POLL_INTERVAL);
        }
      } catch (error) {
        setReindexState((prevValue: ReindexState) => {
          return {
            ...prevValue,
            loadingState: LoadingState.Error,
            errorMessage: error.message.toString(),
            status: DataStreamReindexStatus.fetchFailed,
          };
        });
      }
    },
    [clearPollInterval, api, dataStreamName, reindexState.meta, updateStatus]
  );

  const updateStatus = useCallback(async () => {
    return pollingFunction(reindexState.resolutionType);
  }, [pollingFunction, reindexState.resolutionType]);

  const startReindex = useCallback(async () => {
    setReindexState((prevValue: ReindexState) => {
      return {
        ...prevValue,
        status: DataStreamReindexStatus.inProgress,
        reindexTaskPercComplete: null,
        errorMessage: null,
        cancelLoadingState: undefined,
      };
    });

    if (reindexState.status === DataStreamReindexStatus.failed) {
      try {
        await api.cancelDataStreamReindexTask(dataStreamName);
      } catch (_) {
        // if the task has already failed, attempt to cancel the task
        // before attempting to start the reindexing again.
      }
    }

    const { data: reindexOp, error } = await api.startDataStreamReindexTask(dataStreamName);

    if (error) {
      setReindexState((prevValue: ReindexState) => {
        return {
          ...prevValue,
          loadingState: LoadingState.Error,
          errorMessage: error.message.toString(),
          status: DataStreamReindexStatus.failed,
        };
      });
      return;
    }

    setReindexState((prevValue: ReindexState) => {
      return getReindexState(prevValue, { reindexOp, meta: prevValue.meta });
    });
    updateStatus();
  }, [api, dataStreamName, updateStatus, reindexState.status]);

  const loadDataStreamMetadata = useCallback(async () => {
    try {
      const { data, error } = await api.getDataStreamMetadata(dataStreamName);

      if (error) {
        throw error;
      }

      setReindexState((prevValue: ReindexState) => {
        return {
          ...prevValue,
          loadingState: LoadingState.Success,
          meta: data || null,
        };
      });
    } catch (error) {
      setReindexState((prevValue: ReindexState) => {
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
    setReindexState((prevValue: ReindexState) => {
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

      setReindexState((prevValue: ReindexState) => {
        return {
          ...prevValue,
          cancelLoadingState: CancelLoadingState.Success,
          status: DataStreamReindexStatus.cancelled,
        };
      });
    } catch (error) {
      setReindexState((prevValue: ReindexState) => {
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
    setReindexState((prevValue: ReindexState) => {
      return {
        ...prevValue,
        resolutionType: 'readonly',
        status: DataStreamReindexStatus.inProgress,
        reindexTaskPercComplete: null,
      };
    });

    readonlyState.current = readOnlyExecute(dataStreamName, reindexState.meta, api);

    pollingFunction('readonly');
  }, [api, dataStreamName, reindexState, pollingFunction]);

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
    reindexState,
    loadDataStreamMetadata,

    startReindex,
    cancelReindex,
    updateStatus,

    startReadonly,
  };
};
