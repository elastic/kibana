/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';

import { TASK_TYPE, type SetupTaskParams } from './utils';

const DEFAULT_SETUP_TASKS: SetupTaskParams[] = [
  { type: 'backportPackagePolicyInputId' },
  { type: 'migrateComponentTemplateILMs' },
];

/**
 * Schedule Fleet setup tasks.
 *
 * @param taskManagerStart - Task manager start contract
 * @param taskParams - Optional specific task to schedule. If not provided, schedules default setup tasks.
 */
export async function scheduleSetupTask(
  taskManagerStart: TaskManagerStartContract,
  taskParams?: SetupTaskParams
) {
  const tasksToSchedule = taskParams ? [taskParams] : DEFAULT_SETUP_TASKS;

  for (let i = 0; i < tasksToSchedule.length; i++) {
    const params = tasksToSchedule[i];
    await taskManagerStart.ensureScheduled({
      id: `${TASK_TYPE}:${params.type}`,
      scope: ['fleet'],
      params,
      taskType: TASK_TYPE,
      // Stagger task execution by 3 seconds each
      runAt: new Date(Date.now() + (i + 1) * 3 * 1000),
      state: {},
    });
  }
}
