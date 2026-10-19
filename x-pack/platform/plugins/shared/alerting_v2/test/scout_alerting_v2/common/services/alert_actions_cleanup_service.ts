/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient, ScoutLogger } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { SerializedConcreteTaskInstance } from '@kbn/task-manager-plugin/server/task';
import { TASK_MANAGER_INDEX } from '@kbn/task-manager-plugin/server/constants';
import { ALERT_ACTIONS_CLEANUP_TASK_ID } from '../../../../server/lib/tasks/alert_actions_cleanup/constants';
import { POLL_INTERVAL_MS, POLL_TIMEOUT_MS } from '../constants';
import { countTaskRuns } from './task_event_log';
import type { TaskManagerService } from './task_manager_service';

/**
 * Test-time accessor for the `.alert-actions` cleanup task. The task only
 * exists when `xpack.alerting_v2.retention.alertActions.dispatcher.enabled` is set.
 */
export interface AlertActionsCleanupService {
  /** Returns the persisted task instance, or `undefined` if it is not scheduled. */
  getTask: () => Promise<SerializedConcreteTaskInstance | undefined>;
  /** Triggers an immediate run and waits until Task Manager logs it as finished. */
  runAndWait: () => Promise<void>;
}

export const getAlertActionsCleanupService = ({
  log,
  esClient,
  taskManager,
}: {
  log: ScoutLogger;
  esClient: EsClient;
  taskManager: TaskManagerService;
}): AlertActionsCleanupService => ({
  getTask: () =>
    measurePerformanceAsync(log, 'alertActionsCleanup.getTask', async () => {
      const taskDoc = await esClient.get<{ task: SerializedConcreteTaskInstance }>(
        { id: `task:${ALERT_ACTIONS_CLEANUP_TASK_ID}`, index: TASK_MANAGER_INDEX },
        { ignore: [404] }
      );
      return taskDoc._source?.task;
    }),

  runAndWait: () =>
    measurePerformanceAsync(log, 'alertActionsCleanup.runAndWait', async () => {
      const sinceMs = Date.now();

      await taskManager.runSoon(ALERT_ACTIONS_CLEANUP_TASK_ID);

      await expect
        .poll(() => countTaskRuns({ esClient, taskId: ALERT_ACTIONS_CLEANUP_TASK_ID, sinceMs }), {
          timeout: POLL_TIMEOUT_MS,
          intervals: [POLL_INTERVAL_MS],
        })
        .toBeGreaterThanOrEqual(1);
    }),
});
