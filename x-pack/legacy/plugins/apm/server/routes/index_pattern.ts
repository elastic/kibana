/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { InternalCoreSetup } from 'src/core/server';
import { getAPMIndexPattern } from '../lib/index_pattern';

const defaultErrorHandler = (err: Error & { status?: number }) => {
  // eslint-disable-next-line
  console.error(err.stack);
  throw Boom.boomify(err, { statusCode: err.status || 500 });
};

export function initIndexPatternApi(core: InternalCoreSetup) {
  const { server } = core.http;
  server.route({
    method: 'GET',
    path: '/api/apm/index_pattern',
    options: {
      tags: ['access:apm']
    },
    handler: async req => {
      return await getAPMIndexPattern(server).catch(defaultErrorHandler);
    }
  });
}
