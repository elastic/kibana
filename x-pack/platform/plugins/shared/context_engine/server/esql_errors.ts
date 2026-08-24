/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isResponseError } from '@kbn/es-errors';
import type { errors } from '@elastic/elasticsearch';

/**
 * ES|QL rejects a query that names a column no index in the target maps, as a 400
 * `verification_exception` rather than returning empty results. Mirrors
 * `isEsqlUnknownIndexError` from `@kbn/storage-adapter`, which handles the missing-index case the
 * same way.
 */
export const isEsqlUnknownColumnError = (error: unknown): boolean => {
  if (!isResponseError(error as Error)) {
    return false;
  }
  const responseError = error as errors.ResponseError;
  if (responseError.statusCode !== 400) {
    return false;
  }
  const body = responseError.body as { error?: { type?: string; reason?: string } } | undefined;
  return (
    body?.error?.type === 'verification_exception' &&
    typeof body?.error?.reason === 'string' &&
    body.error.reason.includes('Unknown column')
  );
};
