/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const failedStep = Symbol('AlertingRuleExecutionFailedStep');

interface FailedStepError extends Error {
  [failedStep]?: string;
}

/**
 * Records which pipeline step a rule-execution error originated from, by
 * decorating the error in place and returning the same instance.
 */
export const tagFailedStep = <T>(error: T, step: string): T => {
  if (error instanceof Error && (error as FailedStepError)[failedStep] === undefined) {
    (error as FailedStepError)[failedStep] = step;
  }

  return error;
};

/** Name of the step that threw, when the error carries a tag. */
export const getFailedStep = (error: unknown): string | undefined =>
  error instanceof Error ? (error as FailedStepError)[failedStep] : undefined;
