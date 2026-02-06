/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingServerStartDependencies } from '../../types';
import { DISPATCHER_TASK_ID, DISPATCHER_TASK_TYPE } from './task_definition';

export const INTERVAL = '30s';

export async function scheduleDispatcherTask({
  taskManager,
}: {
  taskManager: AlertingServerStartDependencies['taskManager'];
}): Promise<void> {
  await taskManager.ensureScheduled({
    id: DISPATCHER_TASK_ID,
    taskType: DISPATCHER_TASK_TYPE,
    schedule: {
      interval: INTERVAL,
    },
    scope: ['alerting'],
    state: {},
    params: {},
    enabled: true,
  });
}
