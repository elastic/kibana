/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Pod-build port: `@kbn/task-manager-plugin/server`'s package entry re-exports the entire Task
 * Manager implementation (task store, routes, claim strategies), not just the pure helpers and
 * enums most plugins import from it at runtime. Each export below is re-exported from its real,
 * specific source file instead of the package barrel.
 *
 * `runInvalidate` is deliberately NOT here: it lives in `task_manager_server_with_invalidate.ts`,
 * redirected to only for Alerting v2's own `invalidate_pending_api_keys` task, because it pulls
 * `@kbn/core-http-router-server-internal` (and through it `elastic-apm-node`, `@grpc/grpc-js`, the
 * OpenTelemetry SDK) into every pod that imports anything at all from this package otherwise — see
 * `build.mjs`'s `POD_SPECIFIER_REDIRECTS` comment for the measured cost.
 */
export {
  createTaskRunError,
  getErrorSource,
  isUnrecoverableError,
  TaskErrorSource,
  throwUnrecoverableError,
  throwRetryableError,
} from '../../../../task_manager/server/task_running/errors';
export { TaskStatus, TaskCost, TaskPriority } from '../../../../task_manager/server/task';
export {
  EVENT_LOG_ACTIONS,
  EVENT_LOG_PROVIDER,
} from '../../../../task_manager/server/constants';
export { TaskAlreadyRunningError } from '../../../../task_manager/server/lib/errors/task_already_running_error';
export { aggregateTaskOverduePercentilesForType } from '../../../../task_manager/server/queries/aggregate_task_overdue_percentiles_for_type';
export { getOldestIdleActionTask } from '../../../../task_manager/server/queries/oldest_idle_action_task';
