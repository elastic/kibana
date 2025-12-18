/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunContext } from '@kbn/task-manager-plugin/server';
import type { RunFunction } from '@kbn/task-manager-plugin/server/task';
import type { TaskContext } from './task_definitions';

export function cancellableTask(
  run: RunFunction,
  runContext: RunContext,
  taskContext: TaskContext
) {
  return async () => {
    if (!runContext.fakeRequest) {
      throw new Error('Request is required to run this task');
    }

    const { taskClient } = await taskContext.getScopedClients({
      request: runContext.fakeRequest,
    });

    try {
      let intervalId: NodeJS.Timeout;
      const cancellationPromise = new Promise<'canceled'>((resolve) => {
        intervalId = setInterval(async () => {
          const task = await taskClient.get(runContext.taskInstance.id);
          if (task.status === 'being_canceled') {
            runContext.abortController.abort();
            await taskClient.update({
              ...task,
              status: 'canceled',
            });
            resolve('canceled' as const);
          }
        }, 5000);
      });

      const result = await Promise.race([run(), cancellationPromise]).finally(() => {
        clearInterval(intervalId);
      });

      if (result === 'canceled') {
        return undefined;
      }

      return result;
    } catch (error) {
      taskContext.logger.error(`Task ${runContext.taskInstance.id} failed unexpectedly`, { error });

      try {
        await taskClient.update({
          id: runContext.taskInstance.id,
          status: 'failed',
          task: {
            params: {},
            error: error.message,
          },
          created_at: new Date().toISOString(),
          space: '',
          type: '',
          stream: '',
        });
      } catch (updateError) {
        taskContext.logger.error('Failed to update task status after error', {
          error: updateError,
        });
      }

      throw error;
    }
  };
}
