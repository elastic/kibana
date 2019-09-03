/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

/**
 * Wraps an unknown error into a Boom error response and returns it
 *
 * @param err Object Unknown error
 * @return Object Boom error response
 */
export function wrapUnknownError(err) {
  return Boom.boomify(err);
}
