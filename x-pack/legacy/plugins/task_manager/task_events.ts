/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConcreteTaskInstance } from './task';

import { Result } from './lib/result_type';

export enum TaskEventType {
  TASK_CLAIM = 'TASK_CLAIM',
  TASK_MARK_RUNNING = 'TASK_MARK_RUNNING',
  TASK_RUN = 'TASK_RUN',
}

export interface TaskEvent<T, E> {
  id: string;
  type: TaskEventType;
  event: Result<T, E>;
}
export type TaskMarkRunning = TaskEvent<ConcreteTaskInstance, Error>;
export type TaskRun = TaskEvent<ConcreteTaskInstance, Error>;
export type TaskClaim = TaskEvent<ConcreteTaskInstance, Error>;

export function asTaskMarkRunningEvent(
  id: string,
  event: Result<ConcreteTaskInstance, Error>
): TaskMarkRunning {
  return {
    id,
    type: TaskEventType.TASK_MARK_RUNNING,
    event,
  };
}

export function asTaskRunEvent(id: string, event: Result<ConcreteTaskInstance, Error>): TaskRun {
  return {
    id,
    type: TaskEventType.TASK_RUN,
    event,
  };
}

export function asTaskClaimEvent(
  id: string,
  event: Result<ConcreteTaskInstance, Error>
): TaskClaim {
  return {
    id,
    type: TaskEventType.TASK_CLAIM,
    event,
  };
}

export function isTaskMarkRunningEvent(
  taskEvent: TaskEvent<any, any>
): taskEvent is TaskMarkRunning {
  return taskEvent.type === TaskEventType.TASK_MARK_RUNNING;
}
export function isTaskRunEvent(taskEvent: TaskEvent<any, any>): taskEvent is TaskRun {
  return taskEvent.type === TaskEventType.TASK_RUN;
}
export function isTaskClaimEvent(taskEvent: TaskEvent<any, any>): taskEvent is TaskClaim {
  return taskEvent.type === TaskEventType.TASK_CLAIM;
}
