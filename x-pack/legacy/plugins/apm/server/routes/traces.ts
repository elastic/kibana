/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InternalCoreSetup } from 'src/core/server';
import { withDefaultQueryParamValidators } from '../lib/helpers/input_validation';
import { setupRequest } from '../lib/helpers/setup_request';
import { getTrace } from '../lib/traces/get_trace';
import { getTransactionGroupList } from '../lib/transaction_groups';

export function initTracesApi(core: InternalCoreSetup) {
  const { server } = core.http;

  // Get trace list
  server.route({
    method: 'GET',
    path: '/api/apm/traces',
    options: {
      validate: {
        query: withDefaultQueryParamValidators()
      },
      tags: ['access:apm']
    },
    handler: async req => {
      const setup = await setupRequest(req);
      return getTransactionGroupList({ type: 'top_traces' }, setup);
    }
  });

  // Get individual trace
  server.route({
    method: 'GET',
    path: `/api/apm/traces/{traceId}`,
    options: {
      validate: {
        query: withDefaultQueryParamValidators()
      },
      tags: ['access:apm']
    },
    handler: async req => {
      const { traceId } = req.params;
      const setup = await setupRequest(req);
      return getTrace(traceId, setup);
    }
  });
}
