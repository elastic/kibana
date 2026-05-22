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
