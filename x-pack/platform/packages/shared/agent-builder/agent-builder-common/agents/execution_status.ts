/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderErrorCode } from '../base/errors';

export enum ExecutionStatus {
  scheduled = 'scheduled',
  running = 'running',
  completed = 'completed',
  failed = 'failed',
  aborted = 'aborted',
}

/** Where an abort request came from. */
export type ExecutionAbortSource =
  /** The abort API, called by a user or an API client. */
  | 'api'
  /** Task Manager cancelled the task: timeout or Kibana shutdown. */
  | 'task_manager'
  /** The caller's abort signal fired: a parent execution aborting, or a client disconnect. */
  | 'caller';

/**
 * Why an execution was aborted. Recorded on the execution document when the status is flipped to
 * `aborted`, forwarded to the executing node as the abort signal's `reason`, carried on the
 * `RequestAbortedError` meta (`abort_reason`) and persisted on the conversation's
 * `execution_aborted` event as `aborted_by`.
 */
export interface ExecutionAbortReason {
  source: ExecutionAbortSource;
  /** The user who requested the abort, when known (`api`, or cascaded from one). */
  actor?: { id: string; username?: string };
  /** For `caller`: the execution whose abort cascaded to this one, when known. */
  parent_execution_id?: string;
}

const EXECUTION_ABORT_SOURCES: readonly string[] = ['api', 'task_manager', 'caller'];

export const isExecutionAbortReason = (value: unknown): value is ExecutionAbortReason =>
  typeof value === 'object' &&
  value !== null &&
  EXECUTION_ABORT_SOURCES.includes((value as { source?: unknown }).source as string);

/**
 * Serialized error stored in the execution document when the execution fails.
 */
export interface SerializedExecutionError {
  /** The error code. */
  code: AgentBuilderErrorCode;
  /** Human-readable error message. */
  message: string;
  /** Optional metadata associated with the error. */
  meta?: Record<string, any>;
}
