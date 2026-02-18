/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskStatus } from '@kbn/streams-schema';
import { useEffect } from 'react';

interface TaskWithStatus {
  status: TaskStatus;
}

export function useTaskPolling(
  task: TaskWithStatus | undefined,
  poll: () => Promise<TaskWithStatus>,
  refresh: () => void
) {
  useEffect(() => {
    if (task?.status !== TaskStatus.InProgress && task?.status !== TaskStatus.BeingCanceled) {
      return;
    }

    let timeoutId: NodeJS.Timeout | undefined;
    let isMounted = true;

    const scheduleNextPoll = () => {
      timeoutId = setTimeout(async () => {
        const polledTask = await poll();

        if (!isMounted) {
          return;
        }

        // We expect the polling endpoint to report if a task becomes stale so the UI can poll until that happens
        // leaving the server to control the time thresholds for staleness
        if (
          polledTask.status !== TaskStatus.InProgress &&
          polledTask.status !== TaskStatus.BeingCanceled
        ) {
          refresh();
          return;
        }

        scheduleNextPoll();
      }, 2000);
    };

    scheduleNextPoll();

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [task?.status, poll, refresh]);
}
