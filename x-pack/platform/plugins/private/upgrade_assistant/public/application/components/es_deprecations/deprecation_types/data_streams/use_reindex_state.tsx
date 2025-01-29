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

const POLL_INTERVAL = 1000;

export interface ReindexState {
  loadingState: LoadingState;
  cancelLoadingState?: CancelLoadingState;

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
  { reindexOp, warnings, hasRequiredPrivileges, meta: updatedMeta }: DataStreamReindexStatusResponse
) => {
  const meta = { ...(updatedMeta ?? reindexState.meta) };
  const newReindexState: ReindexState = {
    ...reindexState,

    reindexWarnings: warnings,
    meta,
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
      console.log('newReindexState::', newReindexState);
      return newReindexState;
    }

    newReindexState.reindexTaskPercComplete = reindexOp.reindexTaskPercComplete;
    newReindexState.errorMessage = reindexOp.errorMessage;

    // if reindex cancellation was "requested" or "loading" and the reindex task is now cancelled,
    // then reindex cancellation has completed, set it to "success"
    if (
      (reindexState.cancelLoadingState === CancelLoadingState.Requested ||
        reindexState.cancelLoadingState === CancelLoadingState.Loading) &&
      reindexOp.status === DataStreamReindexStatus.cancelled
    ) {
      newReindexState.cancelLoadingState = CancelLoadingState.Success;
    } else if (
      // if reindex cancellation has been requested and the reindex task is still in progress,
      // then reindex cancellation has not completed yet, set it to "loading"
      reindexState.cancelLoadingState === CancelLoadingState.Requested &&
      reindexOp.status === DataStreamReindexStatus.inProgress
    ) {
      newReindexState.cancelLoadingState = CancelLoadingState.Loading;
    }
  }

  console.log('newReindexState::', newReindexState);
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
    meta: {
      dataStreamName,
    },
  });

  const pollIntervalIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(false);

  const clearPollInterval = useCallback(() => {
    if (pollIntervalIdRef.current) {
      clearTimeout(pollIntervalIdRef.current);
      pollIntervalIdRef.current = null;
    }
  }, []);

  const updateStatus = useCallback(async () => {
    clearPollInterval();

    const { data, error } = await api.getDataStreamReindexStatus(dataStreamName);
    console.log('updateStatus::', data);

    if (error) {
      console.log('updateStatus error::', error);
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
  }, [clearPollInterval, api, dataStreamName]);

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
  }, [api, dataStreamName, updateStatus]);

  const loadDataStreamMetadata = useCallback(async () => {
    const { data, error } = await api.getDataStreamMetadata(dataStreamName);
    console.log('data::', data);

    if (error) {
      setReindexState((prevValue: ReindexState) => {
        return {
          ...prevValue,
          meta: undefined,
          loadingState: LoadingState.Error,
          errorMessage: error.message.toString(),
          status: DataStreamReindexStatus.failed,
        };
      });
      return;
    }

    setReindexState((prevValue: ReindexState) => {
      return {
        ...prevValue,
        loadingState: LoadingState.Success,
        meta: data,
      };
    });
  }, [api, dataStreamName]);

  const cancelReindex = useCallback(async () => {
    setReindexState((prevValue: ReindexState) => {
      return {
        ...prevValue,
        cancelLoadingState: CancelLoadingState.Requested,
      };
    });

    const { error } = await api.cancelDataStreamReindexTask(dataStreamName);

    if (error) {
      setReindexState((prevValue: ReindexState) => {
        return {
          ...prevValue,
          cancelLoadingState: CancelLoadingState.Error,
        };
      });
      return;
    }
  }, [api, dataStreamName]);

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
  };
};
