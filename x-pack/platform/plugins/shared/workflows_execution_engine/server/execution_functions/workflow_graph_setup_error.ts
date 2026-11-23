/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Thrown by `setupDependencies` when the workflow definition cannot be compiled
 * into an execution graph. The execution has already been persisted as FAILED
 * with the underlying reason at the point this is thrown, so the run task can
 * swallow it and return cleanly instead of letting it surface as a generic,
 * retryable task failure (which would be recovered into a TaskRecoveryError).
 */
export class WorkflowGraphSetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkflowGraphSetupError';
  }
}

export function isWorkflowGraphSetupError(error: unknown): error is WorkflowGraphSetupError {
  return error instanceof WorkflowGraphSetupError;
}
