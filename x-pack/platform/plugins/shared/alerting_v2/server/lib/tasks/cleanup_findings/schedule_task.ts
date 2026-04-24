/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AlertingServerStartDependencies } from '../../../types';
import { emptyState } from './task_state';
import {
  CLEANUP_FINDINGS_TASK_ID,
  CLEANUP_FINDINGS_TASK_TYPE,
  CLEANUP_FINDINGS_TASK_INTERVAL,
} from './task_definition';

export async function scheduleCleanupFindingsTask({
  logger,
  taskManager,
}: {
  logger: Logger;
  taskManager: AlertingServerStartDependencies['taskManager'];
}): Promise<void> {
  try {
    await taskManager.ensureScheduled({
      id: CLEANUP_FINDINGS_TASK_ID,
      taskType: CLEANUP_FINDINGS_TASK_TYPE,
      schedule: { interval: CLEANUP_FINDINGS_TASK_INTERVAL },
      state: emptyState,
      params: {},
    });
  } catch (e) {
    logger.error(
      `Error scheduling ${CLEANUP_FINDINGS_TASK_ID} task, received ${(e as Error).message}`
    );
  }
}
