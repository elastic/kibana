/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withSpan } from '@kbn/apm-utils';
import type { RulesClientContext } from '../../../../rules_client/types';
import type { BulkEnableTasksParams, BulkEnableTasksResult } from './types';

// Enable previously scheduled task manager tasks; returns ids whose enable failed.
export const bulkEnableTasks = async (
  context: RulesClientContext,
  params: BulkEnableTasksParams
): Promise<BulkEnableTasksResult> => {
  const { taskIds } = params;
  const { logger, taskManager } = context;
  const taskIdsFailedToBeEnabled: string[] = [];

  if (taskIds.length === 0) {
    return { taskIdsFailedToBeEnabled };
  }

  try {
    const resultFromEnablingTasks = await withSpan(
      { name: 'taskManager.bulkEnable', type: 'rules' },
      async () => taskManager.bulkEnable(taskIds)
    );
    resultFromEnablingTasks?.errors?.forEach((error) => {
      taskIdsFailedToBeEnabled.push(error.id);
    });
    if (resultFromEnablingTasks.tasks.length) {
      logger.debug(
        `Successfully enabled schedules for underlying tasks: ${resultFromEnablingTasks.tasks
          .map((task) => task.id)
          .join(', ')}`
      );
    }
    if (resultFromEnablingTasks.errors.length) {
      logger.error(
        `Failure to enable schedules for underlying tasks: ${resultFromEnablingTasks.errors
          .map((error) => error.id)
          .join(', ')}`
      );
    }
  } catch (error) {
    taskIdsFailedToBeEnabled.push(...taskIds);
    logger.error(
      `Failure to enable schedules for underlying tasks: ${taskIds.join(
        ', '
      )}. TaskManager bulkEnable failed with Error: ${error.message}`
    );
  }

  return { taskIdsFailedToBeEnabled };
};
