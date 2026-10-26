/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateQuery } from '@kbn/esql-language';
import type { ValidationOptions } from '@kbn/esql-language';

export type ValidateEsqlQueryCallbacks = Parameters<typeof validateQuery>[1];

/**
 * Format a single validation error for the LLM (includes location so the LLM can fix the query).
 * ESQLMessage has location (min/max offsets); EditorError has startLineNumber, startColumn, etc.
 */
function formatValidationError(error: {
  text?: string;
  message?: string;
  location?: { min: number; max: number };
  startLineNumber?: number;
  startColumn?: number;
  endLineNumber?: number;
  endColumn?: number;
}): string {
  const message = 'text' in error ? error.text : error.message;
  if ('startLineNumber' in error && error.startLineNumber != null) {
    const loc = `line ${error.startLineNumber}, column ${error.startColumn ?? 0}`;
    return `${loc}: ${message}`;
  }
  if (error.location != null) {
    return `position ${error.location.min}-${error.location.max}: ${message}`;
  }
  return message || '';
}

export const validateEsqlQuery = async (
  query: string,
  callbacks?: ValidateEsqlQueryCallbacks,
  options?: ValidationOptions
): Promise<string | undefined> => {
  const { errors } = await validateQuery(query, callbacks, options);
  if (errors.length === 0) {
    return undefined;
  }
  return errors.map((err) => formatValidationError(err)).join('\n');
};
