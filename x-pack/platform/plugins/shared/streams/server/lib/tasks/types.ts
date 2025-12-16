/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface PersistedTaskBase {
  id: string;
  type: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'failed';
  stream: string;
  space: string;
  created_at: string;
}

interface NotStartedTask extends PersistedTaskBase {
  status: 'not_started';
}
interface InProgressTask extends PersistedTaskBase {
  status: 'in_progress';
}
interface CompletedTask<TPayload extends {}> extends PersistedTaskBase {
  status: 'completed';
  task: {
    payload: TPayload;
  };
}
interface FailedTask extends PersistedTaskBase {
  status: 'failed';
  task: {
    error: string;
  };
}

export type PersistedTask<TPayload extends {} = {}> =
  | NotStartedTask
  | InProgressTask
  | CompletedTask<TPayload>
  | FailedTask;

export type TaskParams<TParams extends {} = {}> = TParams & {
  _task: PersistedTask;
};
