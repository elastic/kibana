/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const CANCELLATION_ERROR_CODE = 'rule_execution_aborted';

export class RuleExecutionCancellationError extends Error {
  public readonly code = CANCELLATION_ERROR_CODE;

  constructor(message = 'Rule execution aborted', options?: { cause?: unknown }) {
    super(message);
    this.name = 'RuleExecutionCancellationError';

    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

export const isRuleExecutionCancellationError = (
  error: unknown
): error is RuleExecutionCancellationError =>
  error instanceof RuleExecutionCancellationError ||
  (typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === CANCELLATION_ERROR_CODE);
