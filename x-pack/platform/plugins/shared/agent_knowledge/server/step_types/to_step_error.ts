/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import { ExecutionError } from '@kbn/workflows/server';
import { WikiError, type WikiErrorCode } from '../wiki/wiki_error';

const WIKI_ERROR_TYPES: Record<WikiErrorCode, string> = {
  unknown_wiki: 'ValidationError',
  unknown_page_type: 'ValidationError',
  page_too_large: 'ValidationError',
  version_conflict: 'ConflictError',
  invalid_document: 'ApiError',
};

const getStatusCode = (error: unknown): number | undefined =>
  typeof error === 'object' && error !== null && 'statusCode' in error
    ? (error as { statusCode?: number }).statusCode
    : undefined;

/**
 * The engine hands the handler the rendered `with` block unparsed; the step's `inputSchema` only
 * shapes the editor. Parsing here is what applies the bounds at run time.
 */
export const parseStepInput = <Schema extends z.ZodType>(
  schema: Schema,
  input: unknown
): z.output<Schema> => {
  const parsed = schema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }
  const issues = parsed.error.issues
    .map(({ path, message }) => `${path.join('.') || '(root)'}: ${message}`)
    .join('; ');
  throw new ExecutionError({ type: 'ValidationError', message: `Invalid step input: ${issues}` });
};

/** A workflow can branch only on an `ExecutionError`'s type, so a refusal gets its own. */
export const toStepError = (error: unknown, fallbackMessage: string): ExecutionError => {
  if (error instanceof ExecutionError) {
    return error;
  }
  if (error instanceof WikiError) {
    return new ExecutionError({ type: WIKI_ERROR_TYPES[error.code], message: error.message });
  }
  const message = error instanceof Error ? error.message : fallbackMessage;
  const statusCode = getStatusCode(error);
  if (statusCode === 401 || statusCode === 403) {
    return new ExecutionError({ type: 'PermissionError', message });
  }
  return new ExecutionError({ type: 'ApiError', message });
};
