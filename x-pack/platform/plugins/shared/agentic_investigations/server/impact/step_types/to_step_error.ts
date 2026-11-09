/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import { isConversationNotFoundError } from '@kbn/agent-builder-common';
import {
  ImpactConflictError,
  ImpactInvalidRequestError,
  ImpactNotFoundError,
} from '../services/errors';
import { InvestigationsForbiddenError } from '../../investigations/services/investigations_forbidden_error';

const ERROR_TYPES: ReadonlyArray<[new (...args: never[]) => Error, string]> = [
  [InvestigationsForbiddenError, 'PermissionError'],
  [ImpactConflictError, 'ConflictError'],
  [ImpactNotFoundError, 'NotFoundError'],
  [ImpactInvalidRequestError, 'ValidationError'],
];

export const toStepError = (error: unknown, fallbackMessage: string): ExecutionError => {
  if (error instanceof ExecutionError) {
    return error;
  }

  const match = ERROR_TYPES.find(([constructor]) => error instanceof constructor);
  if (match && error instanceof Error) {
    return new ExecutionError({ type: match[1], message: error.message });
  }
  if (isConversationNotFoundError(error)) {
    return new ExecutionError({ type: 'NotFoundError', message: error.message });
  }

  return new ExecutionError({
    type: 'ApiError',
    message: error instanceof Error ? error.message : fallbackMessage,
  });
};
