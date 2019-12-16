/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

/**
 * Wraps an error thrown by the ES JS client into a Boom error response and returns it
 *
 * @param err Object Error thrown by ES JS client
 * @param statusCodeToMessageMap Object Optional map of HTTP status codes => error messages
 * @return Object Boom error response
 */
export function wrapEsError(err, statusCodeToMessageMap = {}) {
  const statusCode = err.statusCode;

  // If no custom message if specified for the error's status code, just
  // wrap the error as a Boom error response and return it
  if (!statusCodeToMessageMap[statusCode]) {
    return Boom.boomify(err, { statusCode });
  }

  // Otherwise, use the custom message to create a Boom error response and
  // return it
  const message = statusCodeToMessageMap[statusCode];
  return new Boom(message, { statusCode });
}
