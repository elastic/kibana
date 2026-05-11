/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Wraps an error thrown by a pipeline step so downstream consumers (notably
 * {@link TelemetryRecorderDecorator}) can map it back to the step that
 * raised it without resorting to `Error` shape sniffing.
 *
 * Cancellation errors are intentionally **not** wrapped — they are routed
 * through {@link CancellationBoundaryMiddleware} and identified via
 * `isRuleExecutionCancellationError`.
 */
export class StepExecutionError extends Error {
  public readonly stepName: string;
  public readonly cause: unknown;

  constructor(stepName: string, cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = 'StepExecutionError';
    this.stepName = stepName;
    this.cause = cause;
    if (cause instanceof Error && typeof cause.stack === 'string') {
      this.stack = cause.stack;
    }
  }
}

export const isStepExecutionError = (error: unknown): error is StepExecutionError =>
  error instanceof StepExecutionError;
