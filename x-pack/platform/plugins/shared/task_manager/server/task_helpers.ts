/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Runtime helpers of `@kbn/task-manager-plugin/server` that have no Task Manager implementation
 * behind them. The package's barrel re-exports the whole plugin (task store, routes, claim
 * strategies), so a bundle that imports one enum from it ends up carrying all of Task Manager.
 * Code that also runs in a task pod imports these from `@kbn/task-manager-plugin/server/task_helpers`.
 */
export {
  createTaskRunError,
  getErrorSource,
  isUnrecoverableError,
  TaskErrorSource,
  throwUnrecoverableError,
  throwRetryableError,
} from './task_running/errors';
export { TaskStatus, TaskCost, TaskPriority } from './task';
export { EVENT_LOG_ACTIONS, EVENT_LOG_PROVIDER } from './constants';
export { TaskAlreadyRunningError } from './lib/errors/task_already_running_error';
export { aggregateTaskOverduePercentilesForType } from './queries/aggregate_task_overdue_percentiles_for_type';
export { getOldestIdleActionTask } from './queries/oldest_idle_action_task';
export { getUiamApiKeySecret } from './lib/api_key_utils';
