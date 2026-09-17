/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { errors } from '@elastic/elasticsearch';
import { badRequest, conflict, forbidden, internal, notFound } from '@hapi/boom';
import { isResponseError, type ElasticsearchErrorDetails } from '@kbn/es-errors';

const getEsError = (error: errors.ResponseError): ElasticsearchErrorDetails['error'] =>
  (error.body as ElasticsearchErrorDetails | undefined)?.error;

export const isEsqlVerificationError = (error: unknown): error is errors.ResponseError =>
  isResponseError(error) &&
  error.statusCode === 400 &&
  getEsError(error)?.type === 'verification_exception';

// ES|QL reports a missing concrete index as `verification_exception` / `Unknown index`, not 404.
export const isEsqlUnknownIndexError = (error: unknown): boolean =>
  isEsqlVerificationError(error) && (getEsError(error)?.reason ?? '').includes('Unknown index');

export const toBoom = (error: unknown, prefix?: string): Error => {
  if (!isResponseError(error)) {
    return error instanceof Error ? error : new Error(String(error));
  }
  const reason = getEsError(error)?.reason ?? error.message;
  const message = prefix ? `${prefix}: ${reason}` : reason;
  switch (error.statusCode) {
    case 400:
      return badRequest(message);
    case 403:
      return forbidden(message);
    case 404:
      return notFound(message);
    case 409:
      return conflict(message);
    default:
      return internal(message);
  }
};
