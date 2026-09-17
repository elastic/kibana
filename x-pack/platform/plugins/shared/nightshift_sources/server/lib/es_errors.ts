/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { errors } from '@elastic/elasticsearch';
import { badRequest, conflict, forbidden, internal, notFound } from '@hapi/boom';
import { isResponseError } from '@kbn/es-errors';

interface EsErrorBody {
  error?: { type?: string; reason?: string };
}

const getEsError = (error: errors.ResponseError): EsErrorBody['error'] =>
  (error.body as EsErrorBody | undefined)?.error;

/** The human-readable reason ES attached to the failure, falling back to the client message. */
export const getEsErrorReason = (error: errors.ResponseError): string =>
  getEsError(error)?.reason ?? error.message;

/** A 400 raised by the ES|QL analyzer: unknown index, unknown column, type mismatch and the like. */
export const isEsqlVerificationError = (error: unknown): error is errors.ResponseError =>
  isResponseError(error) &&
  error.statusCode === 400 &&
  getEsError(error)?.type === 'verification_exception';

// ES|QL reports a concrete index name that does not exist as a `verification_exception` whose
// reason reads `Unknown index [<name>]`, not as a 404.
export const isEsqlUnknownIndexError = (error: unknown): boolean =>
  isEsqlVerificationError(error) && (getEsError(error)?.reason ?? '').includes('Unknown index');

/** Re-throws ES client failures as Boom errors so the HTTP layer keeps the ES status code. */
export const toBoom = (error: unknown, prefix?: string): Error => {
  if (!isResponseError(error)) {
    return error instanceof Error ? error : new Error(String(error));
  }
  const reason = getEsErrorReason(error);
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
