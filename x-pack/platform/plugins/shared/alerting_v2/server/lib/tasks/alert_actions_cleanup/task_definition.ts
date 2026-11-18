/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { TaskCost, TaskPriority } from '@kbn/task-manager-plugin/server';
import type { AlertingTaskDefinition } from '../../services/task_run_scope_service/create_task_runner';
import { ALERT_ACTIONS_CLEANUP_TASK_TIMEOUT, ALERT_ACTIONS_CLEANUP_TASK_TYPE } from './constants';
import { AlertActionsCleanupTaskRunner } from './task_runner';

export const AlertActionsCleanupTaskDefinition: AlertingTaskDefinition<AlertActionsCleanupTaskRunner> =
  {
    taskType: ALERT_ACTIONS_CLEANUP_TASK_TYPE,
    title: 'Alerting v2 alert actions cleanup',
    description:
      'Deletes dispatcher fire, suppress and unmatched docs older than the configured retention from .alert-actions.',
    timeout: ALERT_ACTIONS_CLEANUP_TASK_TIMEOUT,
    maxAttempts: 1,
    cost: TaskCost.Tiny,
    priority: TaskPriority.Maintenance,
    paramsSchema: schema.object({}),
    taskRunnerClass: AlertActionsCleanupTaskRunner,
    requiresFakeRequest: false,
  };
