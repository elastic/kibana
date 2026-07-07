/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useCallback, useState, useEffect } from 'react';

import type {
  DataStreamMigrationWarning,
  DataStreamMetadata,
  DataStreamReindexStatusResponse,
  DataStreamProgressDetails,
  DataStreamResolutionType,
  ResponseError,
} from '../../../../../../common/types';
import { DataStreamMigrationStatus } from '../../../../../../common/types';
import { CancelLoadingState, LoadingState } from '../../../types';
import type { ApiService } from '../../../../lib/api';
import { readOnlyExecute } from './readonly_state';

const POLL_INTERVAL = 3000;

export interface MigrationState {
  loadingState: LoadingState;
  cancelLoadingState?: CancelLoadingState;

  resolutionType?: DataStreamResolutionType;
  status?: DataStreamMigrationStatus;
  taskPercComplete: number | null;
  errorMessage: string | null;
  migrationWarnings?: DataStreamMigrationWarning[];
  hasRequiredPrivileges?: boolean;
  taskStatus?: DataStreamProgressDetails;

  meta: DataStreamMetadata | null;
}

const getMigrationState = (
  migrationState: MigrationState,
  {
    migrationOp,
    warnings,
    hasRequiredPrivileges,
    meta: updatedMeta,
  }: DataStreamReindexStatusResponse & { meta?: DataStreamMetadata | null }
) => {
  const newMigrationState: MigrationState = {
    ...migrationState,
    // @ts-expect-error - resolutionType does non exist in all migration states.
    resolutionType: migrationOp?.resolutionType || migrationState.resolutionType,
    meta: updatedMeta || migrationState.meta,
    loadingState: LoadingState.Success,
  };

  if (warnings) {
    newMigrationState.migrationWarnings = warnings;
  }

  if (hasRequiredPrivileges !== undefined) {
    newMigrationState.hasRequiredPrivileges = hasRequiredPrivileges;
  }

  if (migrationOp) {
    newMigrationState.status = migrationOp.status;

    if (migrationOp.status === DataStreamMigrationStatus.notStarted) {
      return newMigrationState;
    }

    if (migrationOp.status === DataStreamMigrationStatus.failed) {
      newMigrationState.errorMessage = migrationOp.errorMessage;
      return newMigrationState;
    }

    if (
      migrationOp.status === DataStreamMigrationStatus.inProgress ||
      migrationOp.status === DataStreamMigrationStatus.completed
    ) {
      newMigrationState.taskStatus = migrationOp.progressDetails;
      newMigrationState.taskPercComplete = migrationOp.taskPercComplete;
    }

    if (
      migrationState.cancelLoadingState === CancelLoadingState.Requested &&
      migrationOp.status === DataStreamMigrationStatus.inProgress
    ) {
      newMigrationState.cancelLoadingState = CancelLoadingState.Loading;
    }
  }

  return newMigrationState;
};

export const useMigrationStatus = ({
  dataStreamName,
  api,
}: {
  dataStreamName: string;
  api: ApiService;
}) => {
  const [migrationState, setMigrationState] = useState<MigrationState>({
    loadingState: LoadingState.Loading,
    errorMessage: null,
    taskPercComplete: null,
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
    async (resolutionType?: DataStreamResolutionType) => {
      clearPollInterval();
      try {
        if (resolutionType === 'readonly' && !readonlyState.current) {
          return;
        }

        let data: DataStreamReindexStatusResponse | null = null;
        let error: ResponseError | null = null;
        if (resolutionType === 'readonly') {
          if (!readonlyState.current) {
            throw new Error('Readonly state not initialized');
          }

          const { value } = await readonlyState.current.next();

          data = value;
        } else {
          const results = await api.getDataStreamMigrationStatus(dataStreamName);
          data = results.data;
          error = results.error;
        }

        if (error) {
          setMigrationState((prevValue: MigrationState) => {
            return {
              ...prevValue,
              loadingState: LoadingState.Error,
              errorMessage: error!.message.toString(),
              status: DataStreamMigrationStatus.fetchFailed,
            };
          });

          return;
        }

        if (!data) {
          return;
        }

        // The request can resolve after unmount; avoid setting state (and scheduling poll timers)
        // when the hook is no longer mounted.
        if (!isMounted.current) {
          return;
        }

        setMigrationState((prevValue: MigrationState) => {
          return getMigrationState(prevValue, data!);
        });

        if (data.migrationOp && data.migrationOp.status === DataStreamMigrationStatus.inProgress) {
          // Only keep polling if it exists and is in progress.
          pollIntervalIdRef.current = setTimeout(
            () => pollingFunction(migrationState.resolutionType),
            POLL_INTERVAL
          );
        }
      } catch (error) {
        if (!isMounted.current) {
          return;
        }

        setMigrationState((prevValue: MigrationState) => {
          return {
            ...prevValue,
            loadingState: LoadingState.Error,
            errorMessage: error.message.toString(),
            status: DataStreamMigrationStatus.fetchFailed,
          };
        });
      }
    },

    [clearPollInterval, api, dataStreamName, migrationState.resolutionType]
  );

  const updateStatus = useCallback(async () => {
    return pollingFunction(migrationState.resolutionType);
  }, [pollingFunction, migrationState.resolutionType]);

  const startReindex = useCallback(async () => {
    setMigrationState((prevValue: MigrationState) => {
      return {
        ...prevValue,
        status: DataStreamMigrationStatus.inProgress,
        taskPercComplete: null,
        errorMessage: null,
        cancelLoadingState: undefined,
      };
    });

    if (migrationState.status === DataStreamMigrationStatus.failed) {
      try {
        await api.cancelDataStreamReindexTask(dataStreamName);
      } catch (_) {
        // if the task has already failed, attempt to cancel the task
        // before attempting to start the reindexing again.
      }
    }

    const { data: migrationOp, error } = await api.startDataStreamReindexTask(dataStreamName);

    if (error) {
      setMigrationState((prevValue: MigrationState) => {
        return {
          ...prevValue,
          loadingState: LoadingState.Error,
          errorMessage: error.message.toString(),
          status: DataStreamMigrationStatus.failed,
        };
      });
      return;
    }

    setMigrationState((prevValue: MigrationState) => {
      return getMigrationState(prevValue, { migrationOp, meta: prevValue.meta });
    });
    updateStatus();
  }, [api, dataStreamName, updateStatus, migrationState.status]);

  const loadDataStreamMetadata = useCallback(async () => {
    try {
      const { data, error } = await api.getDataStreamMetadata(dataStreamName);

      if (error) {
        throw error;
      }

      if (!isMounted.current) {
        return;
      }

      setMigrationState((prevValue: MigrationState) => {
        return {
          ...prevValue,
          loadingState: LoadingState.Success,
          meta: data || null,
        };
      });
    } catch (error) {
      if (!isMounted.current) {
        return;
      }

      setMigrationState((prevValue: MigrationState) => {
        // if state is completed, we don't need to update the meta
        if (prevValue.status === DataStreamMigrationStatus.completed) {
          return prevValue;
        }

        return {
          ...prevValue,
          loadingState: LoadingState.Error,
          errorMessage: error.message.toString(),
          status: DataStreamMigrationStatus.failed,
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
          status: DataStreamMigrationStatus.cancelled,
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
        status: DataStreamMigrationStatus.inProgress,
        taskPercComplete: null,
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
        status: DataStreamMigrationStatus.cancelled,
      };
    });
  }, []);

  const initMigration = useCallback((resolutionType: DataStreamResolutionType) => {
    setMigrationState((prevValue: MigrationState) => {
      return {
        ...prevValue,
        resolutionType,
        status: DataStreamMigrationStatus.notStarted,
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
    initMigration,
    updateStatus,

    startReindex,
    cancelReindex,
    startReadonly,
    cancelReadonly,
  };
};
