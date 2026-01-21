/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskStatus } from '@kbn/streams-schema';

/**
 * Generic result type for task status/actions endpoints.
 * Uses discriminated union based on status to properly type the payload.
 */
export type TaskResult<TPayload> =
  | {
      status:
        | TaskStatus.NotStarted
        | TaskStatus.InProgress
        | TaskStatus.Stale
        | TaskStatus.BeingCanceled
        | TaskStatus.Canceled;
    }
  | { status: TaskStatus.Failed; error: string }
  | ({ status: TaskStatus.Completed | TaskStatus.Acknowledged } & TPayload);

interface PersistedTaskBase<TParams extends {} = {}> {
  id: string;
  type: string;
  status: Exclude<TaskStatus, TaskStatus.Stale>;
  stream: string;
  space: string;
  created_at: string;
  task: {
    params: TParams;
  };
}

interface NotStartedTask<TParams extends {} = {}> extends PersistedTaskBase<TParams> {
  status: TaskStatus.NotStarted;
}
interface InProgressTask<TParams extends {} = {}> extends PersistedTaskBase<TParams> {
  status: TaskStatus.InProgress;
}
interface BeingCanceledTask<TParams extends {} = {}> extends PersistedTaskBase<TParams> {
  status: TaskStatus.BeingCanceled;
}
interface CanceledTask<TParams extends {} = {}> extends PersistedTaskBase<TParams> {
  status: TaskStatus.Canceled;
}
interface CompletedTask<TParams extends {} = {}, TPayload extends {} = {}>
  extends PersistedTaskBase<TParams> {
  status: TaskStatus.Completed;
  task: PersistedTaskBase<TParams>['task'] & {
    payload: TPayload;
  };
}
interface AcknowledgedTask<TParams extends {} = {}, TPayload extends {} = {}>
  extends PersistedTaskBase<TParams> {
  status: TaskStatus.Acknowledged;
  task: PersistedTaskBase<TParams>['task'] & {
    payload: TPayload;
  };
}
interface FailedTask<TParams extends {} = {}> extends PersistedTaskBase<TParams> {
  status: TaskStatus.Failed;
  task: PersistedTaskBase<TParams>['task'] & {
    error: string;
  };
}

export type PersistedTask<TParams extends {} = {}, TPayload extends {} = {}> =
  | NotStartedTask<TParams>
  | InProgressTask<TParams>
  | CompletedTask<TParams, TPayload>
  | AcknowledgedTask<TParams, TPayload>
  | FailedTask<TParams>
  | BeingCanceledTask<TParams>
  | CanceledTask<TParams>;

export type TaskParams<TParams extends {} = {}> = TParams & {
  _task: PersistedTask;
};
