/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunContext } from '@kbn/task-manager-plugin/server';
import type { RunFunction } from '@kbn/task-manager-plugin/server/task';
import { TaskStatus } from '@kbn/streams-schema';
import type { TaskContext } from './task_definitions';
import type { TaskParams } from './types';

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
        taskContext.logger.debug('Starting cancellable task check loop');
        intervalId = setInterval(async () => {
          const task = await taskClient.get(runContext.taskInstance.id);
          taskContext.logger.trace(
            `Cancellable task check loop for task ${runContext.taskInstance.id}: status is ${task.status}`
          );
          if (task.status === TaskStatus.BeingCanceled) {
            runContext.abortController.abort();
            await taskClient.markCanceled(task);
            resolve('canceled' as const);
          }
        }, 5000);
      });

      taskContext.logger.debug(
        `Running task ${runContext.taskInstance.id} with cancellation support (race)`
      );
      const result = await Promise.race([run(), cancellationPromise]).finally(() => {
        clearInterval(intervalId);
      });

      if (result === 'canceled') {
        taskContext.logger.debug(`Task ${runContext.taskInstance.id} canceled`);
        return undefined;
      }

      taskContext.logger.debug(`Task ${runContext.taskInstance.id} completed`);
      return result;
    } catch (error) {
      taskContext.logger.error(`Task ${runContext.taskInstance.id} failed unexpectedly`, { error });

      try {
        const { _task, ...params } = runContext.taskInstance.params as TaskParams;
        await taskClient.fail(_task, params, error.message);
      } catch (updateError) {
        taskContext.logger.error('Failed to update task status after error', {
          error: updateError,
        });
      }

      throw error;
    }
  };
}
