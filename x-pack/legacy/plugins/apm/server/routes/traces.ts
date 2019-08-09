/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { InternalCoreSetup } from 'src/core/server';
import { withDefaultValidators } from '../lib/helpers/input_validation';
import { setupRequest } from '../lib/helpers/setup_request';
import { getTrace } from '../lib/traces/get_trace';
import { getTransactionGroupList } from '../lib/transaction_groups';

const ROOT = '/api/apm/traces';
const defaultErrorHandler = (err: Error) => {
  // eslint-disable-next-line
  console.error(err.stack);
  throw Boom.boomify(err, { statusCode: 400 });
};

export function initTracesApi(core: InternalCoreSetup) {
  const { server } = core.http;

  // Get trace list
  server.route({
    method: 'GET',
    path: ROOT,
    options: {
      validate: {
        query: withDefaultValidators()
      },
      tags: ['access:apm']
    },
    handler: async req => {
      const setup = await setupRequest(req);
      return getTransactionGroupList({ type: 'top_traces' }, setup).catch(
        defaultErrorHandler
      );
    }
  });

  // Get individual trace
  server.route({
    method: 'GET',
    path: `${ROOT}/{traceId}`,
    options: {
      validate: {
        query: withDefaultValidators()
      },
      tags: ['access:apm']
    },
    handler: async req => {
      const { traceId } = req.params;
      const setup = await setupRequest(req);
      return getTrace(traceId, setup).catch(defaultErrorHandler);
    }
  });
}
