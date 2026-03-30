/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskStatus } from '@kbn/streams-schema';
import { useCallback, useEffect, useRef, useState } from 'react';

interface TaskWithStatus {
  status: TaskStatus;
}

interface UseTaskPollingParams {
  task: TaskWithStatus | undefined;
  onPoll: () => Promise<TaskWithStatus>;
  onRefresh: () => void | Promise<unknown>;
  onCancel?: () => Promise<unknown>;
  pollIntervalMs?: number;
}

export function useTaskPolling({
  task,
  onPoll,
  onRefresh,
  onCancel,
  pollIntervalMs = 2000,
}: UseTaskPollingParams) {
  const [isCancellingRequested, setIsCancellingRequested] = useState(false);
  const isCancellingRequestInFlightRef = useRef(false);

  const isCancellingTask = task?.status === TaskStatus.BeingCanceled || isCancellingRequested;

  /**
   * Resets optimistic cancellation state once task reaches a terminal status.
   */
  useEffect(() => {
    if (task?.status !== TaskStatus.InProgress && task?.status !== TaskStatus.BeingCanceled) {
      setIsCancellingRequested(false);
      isCancellingRequestInFlightRef.current = false;
    }
  }, [task?.status]);

  useEffect(() => {
    if (task?.status !== TaskStatus.InProgress && task?.status !== TaskStatus.BeingCanceled) {
      return;
    }

    let timeoutId: NodeJS.Timeout | undefined;
    let isMounted = true;

    const scheduleNextPoll = () => {
      timeoutId = setTimeout(async () => {
        let polledTask: TaskWithStatus | undefined;
        try {
          polledTask = await onPoll();
        } catch {
          if (isMounted) {
            scheduleNextPoll();
          }
          return;
        }

        if (!isMounted) {
          return;
        }

        // We expect the polling endpoint to report if a task becomes stale so the UI can poll until that happens
        // leaving the server to control the time thresholds for staleness
        if (
          polledTask.status !== TaskStatus.InProgress &&
          polledTask.status !== TaskStatus.BeingCanceled
        ) {
          try {
            await onRefresh();
          } catch {
            if (isMounted) {
              scheduleNextPoll();
            }
          }
          return;
        }

        scheduleNextPoll();
      }, pollIntervalMs);
    };

    scheduleNextPoll();

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [onPoll, onRefresh, pollIntervalMs, task?.status]);

  /**
   * Cancels the task if it is in progress.
   * If the task is already being canceled, does nothing.
   * If the task is not in progress, does nothing.
   * If the task is not in progress and is not being canceled, sets the cancellation state to true and waits for the task to be canceled.
   */
  const cancelTask = useCallback(async () => {
    if (!onCancel || isCancellingRequested || isCancellingRequestInFlightRef.current) {
      return;
    }

    if (task?.status !== TaskStatus.InProgress && task?.status !== TaskStatus.BeingCanceled) {
      return;
    }

    setIsCancellingRequested(true);

    if (task?.status === TaskStatus.BeingCanceled) {
      return;
    }

    isCancellingRequestInFlightRef.current = true;
    try {
      await onCancel();
      await onRefresh();
    } finally {
      isCancellingRequestInFlightRef.current = false;
    }
  }, [isCancellingRequested, onCancel, onRefresh, task?.status]);

  return { cancelTask, isCancellingTask };
}
