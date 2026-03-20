/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AlertingServerStartDependencies } from '../../../types';
import { emptyState } from './task_state';
import { INVALIDATE_API_KEYS_TASK_ID, INVALIDATE_API_KEYS_TASK_TYPE } from './task_definition';

export async function scheduleApiKeyInvalidationTask({
  logger,
  taskManager,
  interval,
}: {
  logger: Logger;
  taskManager: AlertingServerStartDependencies['taskManager'];
  interval: string;
}): Promise<void> {
  try {
    await taskManager.ensureScheduled({
      id: INVALIDATE_API_KEYS_TASK_ID,
      taskType: INVALIDATE_API_KEYS_TASK_TYPE,
      schedule: { interval },
      state: emptyState,
      params: {},
    });
  } catch (e) {
    logger.error(
      `Error scheduling ${INVALIDATE_API_KEYS_TASK_ID} task, received ${(e as Error).message}`
    );
  }
}
