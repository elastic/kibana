/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';

interface TaskWithStatus {
  status: string;
}

export function useTaskPolling(
  task: TaskWithStatus | undefined,
  poll: () => Promise<TaskWithStatus>,
  refresh: () => void
) {
  useEffect(() => {
    if (task?.status !== 'in_progress' && task?.status !== 'being_canceled') {
      return;
    }

    const startTime = Date.now();
    const maxDuration = 5 * 60 * 1000;
    const pollInterval = 2000;

    const intervalId = setInterval(async () => {
      if (Date.now() - startTime > maxDuration) {
        clearInterval(intervalId);
        return;
      }

      const polledTask = await poll();

      if (polledTask.status !== 'in_progress' && polledTask.status !== 'being_canceled') {
        clearInterval(intervalId);
        refresh();
      }
    }, pollInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [task?.status, poll, refresh]);
}
