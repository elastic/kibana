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
 * Client-side workflow execution status result.
 * `T` extends the `Completed` variant with workflow-specific output data.
 *
 * `InProgress` and `BeingCanceled` carry `executionId?: string` (optional/undefined)
 * because they may be set optimistically on the client before the server response
 * provides the real id. All other non-NotStarted variants carry `executionId: string`.
 *
 * Note: `BeingCanceled` is a client-only optimistic state — the server never
 * returns it. For the server-returned shape use {@link SigEventsWorkflowServerStatusResult}.
 */
export type SigEventsWorkflowStatusResult<T extends object = {}> =
  | { status: SigEventsWorkflowStatus.NotStarted; executionId: null }
  | {
      status: SigEventsWorkflowStatus.InProgress | SigEventsWorkflowStatus.BeingCanceled;
      executionId?: string;
    }
  | ({ executionId: string } & (
      | { status: SigEventsWorkflowStatus.Canceled }
      | { status: SigEventsWorkflowStatus.Failed; error: string }
      | ({ status: SigEventsWorkflowStatus.Completed } & T)
    ));

/**
 * Server-returned workflow status result — identical to {@link SigEventsWorkflowStatusResult}
 * but excludes the client-only `BeingCanceled` variant.
 */
export type SigEventsWorkflowServerStatusResult<T extends object = {}> = Exclude<
  SigEventsWorkflowStatusResult<T>,
  { status: SigEventsWorkflowStatus.BeingCanceled }
>;
