/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AlertingServerStartDependencies } from '../../types';
import { emptyState } from './task_state';
import { TASK_ID, SCHEDULE, TELEMETRY_TASK_TYPE } from './task_definition';

export async function scheduleTelemetryTask({
  logger,
  taskManager,
}: {
  logger: Logger;
  taskManager: AlertingServerStartDependencies['taskManager'];
}): Promise<void> {
  try {
    await taskManager.ensureScheduled({
      id: TASK_ID,
      taskType: TELEMETRY_TASK_TYPE,
      schedule: SCHEDULE,
      state: emptyState,
      params: {},
    });
  } catch (err) {
    logger.error(`Error scheduling ${TASK_ID}, received ${err.message}`, {
      error: { stack_trace: err.stack },
    });
  }
}
