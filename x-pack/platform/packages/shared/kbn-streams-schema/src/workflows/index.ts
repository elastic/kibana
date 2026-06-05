/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Canonical workflow execution status shared across all workflow types.
 * `BeingCanceled` is a client-only optimistic state; the server never returns it.
 */
export enum SigEventsWorkflowStatus {
  NotStarted = 'not_started',
  InProgress = 'in_progress',
  /** Client-only optimistic state; the server never returns this value. */
  BeingCanceled = 'being_canceled',
  Canceled = 'canceled',
  Failed = 'failed',
  Completed = 'completed',
}

/**
 * Generic discriminated union for a workflow execution status result.
 * `T` extends the `Completed` variant with workflow-specific output data.
 * All non-NotStarted variants carry `executionId: string`.
 */
export type SigEventsWorkflowStatusResult<T extends object = {}> =
  | { status: SigEventsWorkflowStatus.NotStarted; executionId: null }
  | {
      status:
        | SigEventsWorkflowStatus.InProgress
        | SigEventsWorkflowStatus.BeingCanceled
        | SigEventsWorkflowStatus.Canceled;
      executionId: string;
    }
  | { status: SigEventsWorkflowStatus.Failed; executionId: string; error: string }
  | ({ status: SigEventsWorkflowStatus.Completed; executionId: string } & T);
