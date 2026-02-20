/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum TaskStatus {
  NotStarted = 'not_started',
  InProgress = 'in_progress',
  Stale = 'stale',
  BeingCanceled = 'being_canceled',
  Canceled = 'canceled',
  Failed = 'failed',
  Completed = 'completed',
  Acknowledged = 'acknowledged',
}

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
