/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import {
  ProposalConflictError,
  ProposalExpiredError,
  ProposalForbiddenError,
  ProposalInvalidActionInputError,
  ProposalNotFoundError,
} from '../services/errors';

/**
 * Gives each failure mode its own `ExecutionError.type`, which is the only part
 * of an error a workflow can branch on — `ExecutionError` carries just
 * `{ type, message, details? }`, and every timeout source already shares
 * `TimeoutError`, so an untyped failure is indistinguishable from the rest.
 *
 * A refusal in particular has to stay separable from a service fault: the two
 * want opposite handling, and only the type says which happened.
 */
const ERROR_TYPES: ReadonlyArray<[new (...args: never[]) => Error, string]> = [
  [ProposalForbiddenError, 'PermissionError'],
  [ProposalConflictError, 'ConflictError'],
  [ProposalExpiredError, 'ExpiredError'],
  [ProposalNotFoundError, 'NotFoundError'],
  [ProposalInvalidActionInputError, 'ValidationError'],
];

export const toStepError = (error: unknown, fallbackMessage: string): ExecutionError => {
  if (error instanceof ExecutionError) {
    return error;
  }

  const match = ERROR_TYPES.find(([constructor]) => error instanceof constructor);
  if (match && error instanceof Error) {
    return new ExecutionError({ type: match[1], message: error.message });
  }

  return new ExecutionError({
    type: 'ApiError',
    message: error instanceof Error ? error.message : fallbackMessage,
  });
};
