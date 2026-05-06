/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const STEP_NAME_PROPERTY = '__alertingV2RuleExecutorStepName';

export function identifyErrorWithStepName(error: unknown, stepName: string): unknown {
  if (error == null || typeof error !== 'object') {
    return error;
  }

  if (Object.prototype.hasOwnProperty.call(error, STEP_NAME_PROPERTY)) {
    return error;
  }

  Object.defineProperty(error, STEP_NAME_PROPERTY, {
    value: stepName,
    enumerable: false,
    writable: false,
    configurable: false,
  });

  return error;
}

export function getStepNameFromError(error: unknown): string | undefined {
  if (error == null || typeof error !== 'object') {
    return undefined;
  }

  const value = (error as { [STEP_NAME_PROPERTY]?: unknown })[STEP_NAME_PROPERTY];
  return typeof value === 'string' ? value : undefined;
}
