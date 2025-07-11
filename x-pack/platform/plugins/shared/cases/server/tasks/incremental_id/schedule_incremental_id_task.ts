/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { TaskStatus, type TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import {
  CASES_INCREMENTAL_ID_SYNC_TASK_ID,
  CASES_INCREMENTAL_ID_SYNC_TASK_TYPE,
} from '../../../common/constants';
import type { ConfigType } from '../../config';

export async function scheduleIncrementalIdTask(
  config: ConfigType,
  taskManager: TaskManagerStartContract,
  loggerParent: Logger
) {
  const logger = loggerParent.get('incremental_id_task');

  // Prevent scheduling task if already scheduled
  try {
    const taskDoc = await taskManager.get(CASES_INCREMENTAL_ID_SYNC_TASK_ID);
    const scheduledToRunInTheFuture = taskDoc.runAt.getTime() >= new Date().getTime();
    const running = taskDoc.status === TaskStatus.Claiming || taskDoc.status === TaskStatus.Running;
    if (scheduledToRunInTheFuture || running) {
      logger.info(
        `${CASES_INCREMENTAL_ID_SYNC_TASK_ID} is already ${
          scheduledToRunInTheFuture
            ? `scheduled (time: ${taskDoc.runAt})`
            : `running (status: ${taskDoc.status})`
        }. No need to schedule it again.`
      );
      return;
    }
  } catch (e) {
    logger.warn(
      `Could not check status of ${CASES_INCREMENTAL_ID_SYNC_TASK_ID}, will continue scheduling it.`
    );
  }

  taskManager
    .ensureScheduled({
      id: CASES_INCREMENTAL_ID_SYNC_TASK_ID,
      taskType: CASES_INCREMENTAL_ID_SYNC_TASK_TYPE,
      // start delayed to give the system some time to start up properly
      runAt: new Date(
        new Date().getTime() + config.incrementalId.taskStartDelayMinutes * 60 * 1000
      ),
      schedule: {
        interval: `${config.incrementalId.taskIntervalMinutes}m`,
      },
      params: {},
      state: {},
      scope: ['cases'],
    })
    .then(
      (taskInstance) => {
        logger.info(
          `${CASES_INCREMENTAL_ID_SYNC_TASK_ID} scheduled with interval ${taskInstance.schedule?.interval}`
        );
      },
      (e) => {
        logger.error(
          `Error scheduling task: ${CASES_INCREMENTAL_ID_SYNC_TASK_ID}: ${e}`,
          e?.message ?? e
        );
      }
    );
}
