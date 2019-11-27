/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConcreteTaskInstance } from './task';

import { Result } from './lib/result_type';

export type TaskRun = Result<ConcreteTaskInstance, [ConcreteTaskInstance, Error]>;
export type TaskRunNow = Result<void, Error>;
export type TaskClaim = Result<ConcreteTaskInstance, Error>;

export enum TaskEventType {
  TASK_RUN_NOW,
  TASK_RUN,
  TASK_CLAIM,
}

export type TaskEvent = {
  id: string;
} & (
  | {
      type: TaskEventType.TASK_RUN;
      event: TaskRun;
    }
  | {
      type: TaskEventType.TASK_CLAIM;
      event: TaskClaim;
    }
  | {
      type: TaskEventType.TASK_RUN_NOW;
      event: TaskRunNow;
    }
);

export function asTaskRunEvent(
  id: string,
  event: Result<ConcreteTaskInstance, [ConcreteTaskInstance, Error]>
): TaskEvent {
  return {
    id,
    type: TaskEventType.TASK_RUN,
    event,
  };
}

export function asTaskRunNowEvent(id: string, event: Result<void, Error>): TaskEvent {
  return {
    id,
    type: TaskEventType.TASK_RUN_NOW,
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
