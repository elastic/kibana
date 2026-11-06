/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { TaskScheduling } from '../task_scheduling';
import {
  MARK_REMOVED_TASKS_TASK_ID as TASK_ID,
  MARK_REMOVED_TASKS_TASK_TYPE as TASK_TYPE,
  SCHEDULE_INTERVAL,
} from '../task_types/mark_removed_tasks_as_unrecognized.task';

export async function scheduleMarkRemovedTasksAsUnrecognizedDefinition(
  logger: Logger,
  taskScheduling: TaskScheduling
) {
  try {
    await taskScheduling.ensureScheduled({
      id: TASK_ID,
      taskType: TASK_TYPE,
      schedule: { interval: SCHEDULE_INTERVAL },
      state: {},
      params: {},
    });
  } catch (e) {
    logger.error(`Error scheduling ${TASK_ID} task, received ${e.message}`);
  }
}
