/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingServerStartDependencies } from '../../types';
import { ALERTING_LOG_CODES } from '../errors/error_codes';
import type { LoggerServiceContract } from '../services/logger_service/logger_service';
import { emptyState } from './task_state';
import { TASK_ID, SCHEDULE, TELEMETRY_TASK_TYPE } from './constants';

export async function scheduleTelemetryTask({
  logger,
  taskManager,
}: {
  logger: LoggerServiceContract;
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
  } catch (error) {
    logger.error({
      error,
      code: ALERTING_LOG_CODES.TASKS_SCHEDULE_FAILED,
      labels: { task_id: TASK_ID },
    });
  }
}
