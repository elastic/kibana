/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import type { TaskManagerConfig } from './config';
export declare const plugin: (
  initContext: PluginInitializerContext
) => Promise<import('./plugin').TaskManagerPlugin>;
export type {
  TaskInstance,
  ConcreteTaskInstance,
  TaskRunCreatorFunction,
  RunContext,
  IntervalSchedule,
} from './task';
export { Frequency, Weekday } from '@kbn/rrule';
export {
  scheduleRruleSchemaV1,
  scheduleRruleSchemaV2,
  scheduleRruleSchemaV3,
} from './saved_objects';
export type { RruleSchedule } from './task';
export { TaskStatus, TaskPriority, TaskCost, InstanceTaskCost } from './task';
export type { TaskRegisterDefinition, TaskDefinitionRegistry } from './task_type_dictionary';
export { asInterval } from './lib/intervals';
export {
  isUnrecoverableError,
  throwUnrecoverableError,
  throwRetryableError,
  createTaskRunError,
  TaskErrorSource,
} from './task_running';
export type { DecoratedError } from './task_running';
export type { RunNowResult, BulkUpdateTaskResult } from './task_scheduling';
export { getOldestIdleActionTask } from './queries/oldest_idle_action_task';
export {
  IdleTaskWithExpiredRunAt,
  RunningOrClaimingTaskWithExpiredRetryAt,
} from './queries/mark_available_tasks_as_claimed';
export { aggregateTaskOverduePercentilesForType } from './queries/aggregate_task_overdue_percentiles_for_type';
export { runInvalidate } from './invalidate_api_keys/lib';
export type {
  TaskManagerPlugin as TaskManager,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from './plugin';
export { TaskAlreadyRunningError } from './lib/errors';
export { EVENT_LOG_ACTIONS, EVENT_LOG_PROVIDER } from './constants';
export declare const config: PluginConfigDescriptor<TaskManagerConfig>;
