/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

/**
 * Wraps ES errors into a Boom error response and returns it
 * This also handles the permissions issue gracefully
 *
 * @param err Object ES error
 * @return Object Boom error response
 */
export function wrapEsError(err) {
  return Boom.boomify(err, { statusCode: err.statusCode });
}
