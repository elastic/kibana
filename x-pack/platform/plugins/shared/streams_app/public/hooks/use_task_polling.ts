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

    const intervalId = setInterval(async () => {
      const polledTask = await poll();

      // We expect the polling endpoint to report if a task becomes stale so the UI can poll until that happens
      // leaving the server to control the time thresholds for staleness
      if (
        polledTask.status !== TaskStatus.InProgress &&
        polledTask.status !== TaskStatus.BeingCanceled
      ) {
        clearInterval(intervalId);
        refresh();
      }
    }, 2000);

    return () => {
      clearInterval(intervalId);
    };
  }, [task?.status, poll, refresh]);
}
