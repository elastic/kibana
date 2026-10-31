/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as esErrors } from '@elastic/elasticsearch';

export const isEsResponseErrorWithStatus = (
  error: unknown,
  statusCode: number
): error is esErrors.ResponseError =>
  error instanceof esErrors.ResponseError && error.statusCode === statusCode;

/** The top-level `error.reason` of an Elasticsearch error response, or its message. */
export const getEsErrorReason = (error: esErrors.ResponseError): string => {
  const reason = (error.body as { error?: { reason?: unknown } } | undefined)?.error?.reason;
  return typeof reason === 'string' ? reason : error.message;
};
