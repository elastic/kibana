/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * Unwraps the real Elasticsearch error reason from a Kibana HTTP client rejection
 * (`error.body.attributes.body.error.reason`, or shallower variants of that shape),
 * falling back to `error.message` and finally to `fallbackMessage` when no reason
 * can be found. Shared by the ES|QL preview and create flows so both surface the
 * same diagnostic instead of a generic HTTP status text (e.g. "Bad Request").
 */
export const extractEsqlErrorReason = (error: unknown, fallbackMessage: string): string => {
  if (!isRecord(error)) return error instanceof Error ? error.message : String(error);

  const errorBody = isRecord(error.body) ? error.body : error;
  const attributes = isRecord(errorBody.attributes) ? errorBody.attributes : undefined;
  const wrappedErrorBody = isRecord(attributes?.body) ? attributes.body : errorBody;
  const elasticsearchError = isRecord(wrappedErrorBody.error) ? wrappedErrorBody.error : undefined;

  if (typeof elasticsearchError?.reason === 'string') return elasticsearchError.reason;
  if (typeof wrappedErrorBody.reason === 'string') return wrappedErrorBody.reason;
  if (typeof error.message === 'string') return error.message;

  return fallbackMessage;
};
