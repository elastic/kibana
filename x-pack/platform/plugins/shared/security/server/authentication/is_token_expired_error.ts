/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';

/** Detects expired native ES or UIAM access tokens, not other authentication errors. */
export const isTokenExpiredError = (error: Error, grant = false): boolean => {
  if (Boom.isBoom(error)) {
    const payload = error.output.payload as { error?: { code?: string } };
    return error.output.statusCode === 401 && payload.error?.code === '0x7E0116';
  }

  if (!(error instanceof errors.ResponseError)) {
    return false;
  }

  const details = error.body?.error;
  if (error.statusCode === 401) {
    return (
      details?.reason === 'token expired' ||
      details?.caused_by?.authentication_error_code === '0x7E0116'
    );
  }
  return (
    grant &&
    error.statusCode === 403 &&
    details?.reason === 'Failed to authenticate api key grant' &&
    details?.caused_by?.type === 'security_exception' &&
    (details.caused_by.reason === 'token expired' ||
      details.caused_by.caused_by?.authentication_error_code === '0x7E0116')
  );
};
