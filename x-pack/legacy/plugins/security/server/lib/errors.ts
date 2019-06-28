/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

export function wrapError(error: any) {
  return Boom.boomify(error, { statusCode: getErrorStatusCode(error) });
}

/**
 * Extracts error code from Boom and Elasticsearch "native" errors.
 * @param error Error instance to extract status code from.
 */
export function getErrorStatusCode(error: any): number {
  return Boom.isBoom(error) ? error.output.statusCode : error.statusCode || error.status;
}
