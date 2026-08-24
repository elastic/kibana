/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';

// Only these error types are reported, to cap the field's cardinality.
const ALLOWED_ERROR_TYPES: ReadonlySet<string> = new Set([
  // ExecutionError types thrown by the KI steps
  'PermissionError',
  'FeatureDisabledError',
  'NotFoundError',
  'ValidationError',
  // Elasticsearch client errors
  'ResponseError',
  'ConnectionError',
  'TimeoutError',
  'RequestAbortedError',
  'NoLivingConnectionsError',
  // Context Engine AI index errors
  'AiIndexNotFoundError',
  'AiIndexAlreadyExistsError',
  'AiIndexConflictError',
  'AiIndexIdConflictError',
  'AiIndexManagedError',
  'InvalidAiIndexDestError',
  'InvalidConnectorSourceError',
]);

/** The error type to report in an EBT payload; never the error message. */
export const errorTypeForTelemetry = (error: unknown): string => {
  const type =
    error instanceof ExecutionError ? error.type : error instanceof Error ? error.name : undefined;
  return type !== undefined && ALLOWED_ERROR_TYPES.has(type) ? type : 'unknown';
};
