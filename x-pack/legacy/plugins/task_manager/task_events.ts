/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConcreteTaskInstance } from './task';

import { Result } from './lib/result_type';

export type TaskMarkRunning = Result<void, Error>;
export type TaskRun = Result<void, object | Error>;
export type TaskClaim = Result<ConcreteTaskInstance, Error>;

export enum TaskEventType {
  TASK_CLAIM = 'TASK_CLAIM',
  TASK_MARK_RUNNING = 'TASK_MARK_RUNNING',
  TASK_RUN = 'TASK_RUN',
}

export type TaskEvent = {
  id: string;
} & (
  | {
      type: TaskEventType.TASK_CLAIM;
      event: TaskClaim;
    }
  | {
      type: TaskEventType.TASK_MARK_RUNNING;
      event: TaskMarkRunning;
    }
  | {
      type: TaskEventType.TASK_RUN;
      event: TaskRun;
    }
);

export function asTaskMarkRunningEvent(id: string, event: Result<void, Error>): TaskEvent {
  return {
    id,
    type: TaskEventType.TASK_MARK_RUNNING,
    event,
  };
}

export function asTaskRunEvent(id: string, event: Result<void, object | Error>): TaskEvent {
  return {
    id,
    type: TaskEventType.TASK_RUN,
    event,
  };
}

export function asTaskClaimEvent(
  id: string,
  event: Result<ConcreteTaskInstance, Error>
): TaskEvent {
  return {
    id,
    type: TaskEventType.TASK_CLAIM,
    event,
  };
}
