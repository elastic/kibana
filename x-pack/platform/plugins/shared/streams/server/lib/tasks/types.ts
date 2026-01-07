/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type TaskStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'acknowledged'
  | 'failed'
  | 'being_canceled'
  | 'canceled';

interface PersistedTaskBase<TParams extends {} = {}> {
  id: string;
  type: string;
  status: TaskStatus;
  stream: string;
  space: string;
  created_at: string;
  task: {
    params: TParams;
  };
}

interface NotStartedTask<TParams extends {} = {}> extends PersistedTaskBase<TParams> {
  status: 'not_started';
}
interface InProgressTask<TParams extends {} = {}> extends PersistedTaskBase<TParams> {
  status: 'in_progress';
}
interface BeingCanceledTask<TParams extends {} = {}> extends PersistedTaskBase<TParams> {
  status: 'being_canceled';
}
interface CanceledTask<TParams extends {} = {}> extends PersistedTaskBase<TParams> {
  status: 'canceled';
}
interface CompletedTask<TParams extends {} = {}, TPayload extends {} = {}>
  extends PersistedTaskBase<TParams> {
  status: 'completed';
  task: PersistedTaskBase<TParams>['task'] & {
    payload: TPayload;
  };
}
interface AcknowledgedTask<TParams extends {} = {}, TPayload extends {} = {}>
  extends PersistedTaskBase<TParams> {
  status: 'acknowledged';
  task: PersistedTaskBase<TParams>['task'] & {
    payload: TPayload;
  };
}
interface FailedTask<TParams extends {} = {}> extends PersistedTaskBase<TParams> {
  status: 'failed';
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
