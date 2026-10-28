/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import type { z } from '@kbn/zod/v4';
import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import { PreDispatchErrorCode } from '../../../common/workflows/contract/error_codes';
import type { PreDispatchErrorCodeValue } from '../../../common/workflows/contract/error_codes';

/** Raised before dispatch: `details.code` is the contract's error code. */
export const stepError = (
  code: PreDispatchErrorCodeValue,
  message: string,
  type: 'ValidationError' | 'NotFoundError' | 'PermissionError' = 'ValidationError'
): ExecutionError => new ExecutionError({ type, message, details: { code } });

const bodyMessage = (error: KibanaApiCallError): string => {
  const body = error.body as { message?: unknown } | undefined;

  return typeof body?.message === 'string' ? body.message : error.message;
};

/** Maps a 401/403/other 4xx from a read made before dispatch. Other failures are rethrown. */
export const toPreDispatchReadError = (what: string, error: unknown): unknown => {
  if (error instanceof KibanaApiCallError) {
    if (error.status === 401 || error.status === 403) {
      return stepError(
        PreDispatchErrorCode.MISSING_PRIVILEGE,
        `${what} was denied (HTTP ${error.status}): ${bodyMessage(error)}`,
        'PermissionError'
      );
    }

    if (error.status >= 400 && error.status < 500) {
      return stepError(
        PreDispatchErrorCode.REQUEST_REJECTED,
        `${what} was rejected (HTTP ${error.status}): ${bodyMessage(error)}`
      );
    }
  }

  return error;
};

/**
 * Maps a failure of the dispatching POST. Returns the error to raise when the route rejected the
 * request before creating anything, or `undefined` when the outcome is unknown (timeout, network
 * error, 5xx): the caller then reports `DISPATCH_UNCONFIRMED` and must not retry.
 */
export const toDispatchRejection = (error: unknown): ExecutionError | undefined => {
  if (!(error instanceof KibanaApiCallError) || error.status >= 500) {
    return undefined;
  }

  const message = bodyMessage(error);
  if (error.status === 401 || error.status === 403) {
    return stepError(
      PreDispatchErrorCode.MISSING_PRIVILEGE,
      `Live query rejected (HTTP ${error.status}): ${message}`,
      'PermissionError'
    );
  }

  if (error.status === 400 && /above the limit of \d+/i.test(message)) {
    return stepError(PreDispatchErrorCode.TARGET_LIMIT_EXCEEDED, message);
  }

  if (error.status === 400 && /No agents found for selection/i.test(message)) {
    return stepError(
      PreDispatchErrorCode.AGENTS_NOT_IN_SPACE,
      'No agents found for the selection: the agents are not in this space, or none of them is online.'
    );
  }

  return stepError(
    PreDispatchErrorCode.REQUEST_REJECTED,
    `Live query rejected (HTTP ${error.status}): ${message}`
  );
};

/**
 * Validates the rendered step input. The engine checks the YAML against the schema when the
 * workflow is saved, not the rendered input at run time, so a stale or unknown key (for example
 * `saved_query_id` or `query`) would otherwise be ignored or crash.
 */
export const parseStepInput = <T>(schema: z.ZodType<T>, input: unknown): T => {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const details = result.error.issues
    .map((issue) =>
      issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message
    )
    .join('; ');
  throw stepError(PreDispatchErrorCode.INVALID_INPUT, `Invalid step input: ${details}`);
};
