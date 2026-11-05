/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { emptyApiKeyInvalidationTaskState } from '@kbn/response-ops-api-keys';
import type { AlertingServerStartDependencies } from '../../../types';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import type { LoggerServiceContract } from '../../services/logger_service/logger_service';
import { INVALIDATE_API_KEYS_TASK_ID, INVALIDATE_API_KEYS_TASK_TYPE } from './task_definition';

export async function scheduleApiKeyInvalidationTask({
  logger,
  taskManager,
  interval,
}: {
  logger: LoggerServiceContract;
  taskManager: AlertingServerStartDependencies['taskManager'];
  interval: string;
}): Promise<void> {
  try {
    await taskManager.ensureScheduled({
      id: INVALIDATE_API_KEYS_TASK_ID,
      taskType: INVALIDATE_API_KEYS_TASK_TYPE,
      schedule: { interval },
      state: emptyApiKeyInvalidationTaskState,
      params: {},
    });
  } catch (error) {
    logger.error({
      error,
      code: ALERTING_LOG_CODES.TASKS_SCHEDULE_FAILED,
      labels: { task_id: INVALIDATE_API_KEYS_TASK_ID },
    });
  }
}
