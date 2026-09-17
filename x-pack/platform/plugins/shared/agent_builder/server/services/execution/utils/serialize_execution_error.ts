/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializedExecutionError } from '@kbn/agent-builder-common';
import { AgentBuilderErrorCode, isAgentBuilderError } from '@kbn/agent-builder-common';

/**
 * Converts an unknown error to a {@link SerializedExecutionError} for persistence.
 * - If the error is already an AgentBuilderError, serializes it using toJSON().
 * - Otherwise, wraps it as an internalError, preserving the HTTP status from
 *   Boom-style errors (or any error carrying a numeric `statusCode`) in
 *   `meta.statusCode` so the route layer can return the correct code.
 */
export const serializeExecutionError = (error: unknown): SerializedExecutionError => {
  if (isAgentBuilderError(error)) {
    return { code: error.code as AgentBuilderErrorCode, message: error.message, meta: error.meta };
  }
  const message = error instanceof Error ? error.message : String(error);
  const statusCode = getHttpStatusFromError(error);
  return {
    code: AgentBuilderErrorCode.internalError,
    message,
    ...(statusCode !== undefined ? { meta: { statusCode } } : {}),
  };
};

const getHttpStatusFromError = (error: unknown): number | undefined => {
  if (typeof error !== 'object' || error === null) return undefined;
  const { output, statusCode } = error as {
    output?: { statusCode?: unknown };
    statusCode?: unknown;
  };
  const candidate =
    typeof output?.statusCode === 'number'
      ? output.statusCode
      : typeof statusCode === 'number'
      ? statusCode
      : undefined;
  return typeof candidate === 'number' && candidate >= 400 && candidate < 600
    ? candidate
    : undefined;
};
