/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';

import { TASK_TYPE } from './utils';

export async function scheduleSetupTask(taskManagerStart: TaskManagerStartContract) {
  await taskManagerStart.ensureScheduled({
    id: `${TASK_TYPE}:backportPackagePolicyInputId`,
    scope: ['fleet'],
    params: { type: 'backportPackagePolicyInputId' },
    taskType: TASK_TYPE,
    runAt: new Date(Date.now() + 3 * 1000),
    state: {},
  });
}
