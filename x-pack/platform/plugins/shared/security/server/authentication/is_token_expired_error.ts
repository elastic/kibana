/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';

/** Detects expired Elasticsearch access tokens, not other authentication errors. */
export const isTokenExpiredError = (error: Error, grant = false): boolean => {
  if (!(error instanceof errors.ResponseError)) {
    return false;
  }

  const details = error.body?.error;
  if (error.statusCode === 401) {
    return details?.reason === 'token expired';
  }
  return (
    grant &&
    error.statusCode === 403 &&
    details?.reason === 'Failed to authenticate api key grant' &&
    details?.caused_by?.type === 'security_exception' &&
    details.caused_by.reason === 'token expired'
  );
};
