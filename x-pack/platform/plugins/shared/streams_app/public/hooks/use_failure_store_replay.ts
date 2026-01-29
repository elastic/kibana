/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAbortController } from '@kbn/react-hooks';
import { useKibana } from './use_kibana';

export type ReplayStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'canceled'
  | 'starting';

export interface ReplayProgress {
  total?: number;
  created?: number;
  updated?: number;
  deleted?: number;
  batches?: number;
  versionConflicts?: number;
  noops?: number;
  retries?: {
    bulk: number;
    search: number;
  };
  requestsPerSecond?: number;
  throttledMillis?: number;
  throttledUntilMillis?: number;
  took?: number;
  failures?: unknown[];
}

export interface ReplayState {
  status: ReplayStatus;
  taskId?: string;
  progress?: ReplayProgress;
  error?: string;
}

interface UseFailureStoreReplayOptions {
  pollIntervalMs?: number;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

const DEFAULT_POLL_INTERVAL_MS = 2000;

export function useFailureStoreReplay(
  streamName: string,
  options: UseFailureStoreReplayOptions = {}
) {
  const { pollIntervalMs = DEFAULT_POLL_INTERVAL_MS, onComplete, onError } = options;

  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const { signal } = useAbortController();

  const [state, setState] = useState<ReplayState>({ status: 'not_started' });
  const [isPolling, setIsPolling] = useState(false);

  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const taskIdRef = useRef<string | undefined>(undefined);
  const mountedRef = useRef(true);

  // Clear polling timeout
  const clearPolling = useCallback(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    setIsPolling(false);
  }, []);

  // Poll for task status
  const pollStatus = useCallback(async () => {
    if (!mountedRef.current || !taskIdRef.current) return;

    try {
      const response = await streamsRepositoryClient.fetch(
        'GET /internal/streams/{name}/failure_store/replay',
        {
          params: {
            path: { name: streamName },
            query: { taskId: taskIdRef.current },
          },
          signal,
        }
      );

      if (!mountedRef.current) return;

      if (response.status === 'in_progress') {
        setState({
          status: 'in_progress',
          taskId: response.taskId,
          progress: {
            total: response.total,
            created: response.created,
            updated: response.updated,
            deleted: response.deleted,
            batches: response.batches,
            versionConflicts: response.versionConflicts,
            noops: response.noops,
            retries: response.retries,
            requestsPerSecond: response.requestsPerSecond,
            throttledMillis: response.throttledMillis,
            throttledUntilMillis: response.throttledUntilMillis,
          },
        });

        // Schedule next poll
        pollTimeoutRef.current = setTimeout(() => {
          pollStatus();
        }, pollIntervalMs);
      } else if (response.status === 'completed') {
        clearPolling();
        setState({
          status: 'completed',
          taskId: response.taskId,
          progress: {
            total: response.total,
            created: response.created,
            updated: response.updated,
            deleted: response.deleted,
            batches: response.batches,
            versionConflicts: response.versionConflicts,
            noops: response.noops,
            retries: response.retries,
            took: response.took,
            failures: response.failures,
          },
        });
        onComplete?.();
      } else if (response.status === 'failed') {
        clearPolling();
        setState({
          status: 'failed',
          taskId: response.taskId,
          error: response.error,
          progress: {
            failures: response.failures,
          },
        });
        onError?.(response.error);
      } else if (response.status === 'canceled') {
        clearPolling();
        setState({
          status: 'canceled',
          taskId: response.taskId,
        });
      } else {
        // not_started - might have been cleaned up
        clearPolling();
        setState({ status: 'not_started' });
      }
    } catch (error) {
      if (!mountedRef.current) return;
      clearPolling();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState({
        status: 'failed',
        taskId: taskIdRef.current,
        error: errorMessage,
      });
      onError?.(errorMessage);
    }
  }, [
    streamsRepositoryClient,
    streamName,
    signal,
    pollIntervalMs,
    clearPolling,
    onComplete,
    onError,
  ]);

  // Start replay task
  const startReplay = useCallback(async () => {
    if (state.status === 'in_progress' || state.status === 'starting') {
      return; // Already running
    }

    setState({ status: 'starting' });
    clearPolling();

    try {
      const response = await streamsRepositoryClient.fetch(
        'POST /internal/streams/{name}/failure_store/replay',
        {
          params: {
            path: { name: streamName },
          },
          signal,
        }
      );

      if (!mountedRef.current) return;

      taskIdRef.current = response.taskId;
      setState({
        status: 'in_progress',
        taskId: response.taskId,
        progress: {
          total: response.total,
          created: response.created,
          updated: response.updated,
          deleted: response.deleted,
          batches: response.batches,
          versionConflicts: response.versionConflicts,
          noops: response.noops,
        },
      });

      // Start polling for status
      setIsPolling(true);
      pollTimeoutRef.current = setTimeout(() => {
        pollStatus();
      }, pollIntervalMs);
    } catch (error) {
      if (!mountedRef.current) return;
      const errorMessage = error instanceof Error ? error.message : 'Failed to start replay';
      setState({
        status: 'failed',
        error: errorMessage,
      });
      onError?.(errorMessage);
    }
  }, [
    state.status,
    streamsRepositoryClient,
    streamName,
    signal,
    clearPolling,
    pollIntervalMs,
    pollStatus,
    onError,
  ]);

  // Cancel replay task
  const cancelReplay = useCallback(async () => {
    if (!taskIdRef.current) return;

    clearPolling();

    try {
      await streamsRepositoryClient.fetch('DELETE /internal/streams/{name}/failure_store/replay', {
        params: {
          path: { name: streamName },
          query: { taskId: taskIdRef.current },
        },
        signal,
      });

      if (!mountedRef.current) return;

      setState({
        status: 'canceled',
        taskId: taskIdRef.current,
      });
    } catch (error) {
      if (!mountedRef.current) return;
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel replay';
      setState((prev) => ({
        ...prev,
        error: errorMessage,
      }));
      onError?.(errorMessage);
    }
  }, [streamsRepositoryClient, streamName, signal, clearPolling, onError]);

  // Reset state
  const reset = useCallback(() => {
    clearPolling();
    taskIdRef.current = undefined;
    setState({ status: 'not_started' });
  }, [clearPolling]);

  // Check for existing replay task on mount
  useEffect(() => {
    const checkExistingTask = async () => {
      try {
        const response = await streamsRepositoryClient.fetch(
          'GET /internal/streams/{name}/failure_store/replay',
          {
            params: {
              path: { name: streamName },
            },
            signal,
          }
        );

        if (!mountedRef.current) return;

        if (response.status === 'in_progress') {
          taskIdRef.current = response.taskId;
          setState({
            status: 'in_progress',
            taskId: response.taskId,
            progress: {
              total: response.total,
              created: response.created,
              updated: response.updated,
              deleted: response.deleted,
              batches: response.batches,
              versionConflicts: response.versionConflicts,
              noops: response.noops,
            },
          });
          // Start polling
          setIsPolling(true);
          pollTimeoutRef.current = setTimeout(() => {
            pollStatus();
          }, pollIntervalMs);
        }
      } catch {
        // Ignore errors on initial check
      }
    };

    checkExistingTask();

    return () => {
      mountedRef.current = false;
      clearPolling();
    };
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    state,
    isPolling,
    startReplay,
    cancelReplay,
    reset,
    isRunning: state.status === 'in_progress' || state.status === 'starting',
    isStarting: state.status === 'starting',
    hasCompleted: state.status === 'completed',
    hasFailed: state.status === 'failed',
    wasCanceled: state.status === 'canceled',
  };
}
