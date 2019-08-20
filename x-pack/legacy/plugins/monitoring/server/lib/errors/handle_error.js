/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { boomify } from 'boom';
import { isKnownError, handleKnownError } from './known_errors';
import { isAuthError, handleAuthError } from './auth_errors';
import { LOGGING_TAG } from '../../../common/constants';

export function handleError(err, req) {
  req.log(['error', LOGGING_TAG], err);

  // specially handle auth errors
  if (isAuthError(err)) {
    return handleAuthError(err);
  }

  // specially "service unavailable" errors
  if (isKnownError(err)) {
    return handleKnownError(err);
  }

  if (err.isBoom) {
    return err;
  }

  // boom expects err.message, not err.msg
  if (err.msg) {
    err.message = err.msg;
    delete err.msg;
  }

  const statusCode = err.isBoom ? err.output.statusCode : err.statusCode;
  // wrap the error; defaults to statusCode = 500 if statusCode is undefined
  return boomify(err, { statusCode, message: err.message });
}
