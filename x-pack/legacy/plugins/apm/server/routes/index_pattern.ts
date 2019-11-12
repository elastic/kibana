/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { getAPMIndexPattern } from '../lib/index_pattern';
import { createRoute } from './create_route';
import { getKueryBarIndexPattern } from '../lib/index_pattern/getKueryBarIndexPattern';
import { setupRequest } from '../lib/helpers/setup_request';

export const indexPatternRoute = createRoute((core, { server }) => ({
  path: '/api/apm/index_pattern',
  handler: async () => {
    return await getAPMIndexPattern(server);
  }
}));

export const kueryBarIndexPatternRoute = createRoute(core => ({
  path: '/api/apm/kuery_bar_index_pattern',
  params: {
    query: t.partial({
      processorEvent: t.union([
        t.literal('transaction'),
        t.literal('metric'),
        t.literal('error')
      ])
    })
  },
  handler: async (request, { query }) => {
    const { processorEvent } = query;

    const setup = await setupRequest(request);

    return getKueryBarIndexPattern({ request, processorEvent, setup });
  }
}));
