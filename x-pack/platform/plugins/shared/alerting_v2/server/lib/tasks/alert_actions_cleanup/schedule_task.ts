/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingServerStartDependencies } from '../../../types';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import type { LoggerServiceContract } from '../../services/logger_service/logger_service';
import {
  ALERT_ACTIONS_CLEANUP_TASK_ID,
  ALERT_ACTIONS_CLEANUP_TASK_INTERVAL,
  ALERT_ACTIONS_CLEANUP_TASK_TYPE,
} from './constants';

export async function scheduleAlertActionsCleanupTask({
  logger,
  taskManager,
  enabled,
}: {
  logger: LoggerServiceContract;
  taskManager: AlertingServerStartDependencies['taskManager'];
  enabled: boolean;
}): Promise<void> {
  if (!enabled) {
    await removeAlertActionsCleanupTask({ logger, taskManager });
    return;
  }

  try {
    await taskManager.ensureScheduled({
      id: ALERT_ACTIONS_CLEANUP_TASK_ID,
      taskType: ALERT_ACTIONS_CLEANUP_TASK_TYPE,
      schedule: { interval: ALERT_ACTIONS_CLEANUP_TASK_INTERVAL },
      state: {},
      params: {},
    });
  } catch (error) {
    logger.error({
      error,
      code: ALERTING_LOG_CODES.TASKS_SCHEDULE_FAILED,
      labels: { task_id: ALERT_ACTIONS_CLEANUP_TASK_ID },
    });
  }
}

async function removeAlertActionsCleanupTask({
  logger,
  taskManager,
}: {
  logger: LoggerServiceContract;
  taskManager: AlertingServerStartDependencies['taskManager'];
}): Promise<void> {
  try {
    await taskManager.removeIfExists(ALERT_ACTIONS_CLEANUP_TASK_ID);
  } catch (error) {
    logger.warn({
      error,
      code: ALERTING_LOG_CODES.TASKS_REMOVE_FAILED,
      labels: { task_id: ALERT_ACTIONS_CLEANUP_TASK_ID },
      message: `Failed to remove the disabled alert actions cleanup task. If it was scheduled by an
        earlier start it keeps running until the next restart`,
    });
  }
}
