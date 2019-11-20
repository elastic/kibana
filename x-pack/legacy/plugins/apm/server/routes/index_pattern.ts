/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { createStaticIndexPattern } from '../lib/index_pattern/create_static_index_pattern';
import { createRoute } from './create_route';
import { setupRequest } from '../lib/helpers/setup_request';

export const staticIndexPatternRoute = createRoute((core, { server }) => ({
  method: 'POST',
  path: '/api/apm/index_pattern/static',
  handler: async (req, params, h) => {
    const setup = await setupRequest(req);
    await createStaticIndexPattern(setup, server);

    // send empty response regardless of outcome
    return h.response().code(204);
  }
}));

export const dynamicIndexPatternRoute = createRoute(() => ({
  path: '/api/apm/index_pattern/dynamic',
  params: {
    query: t.partial({
      processorEvent: t.union([
        t.literal('transaction'),
        t.literal('metric'),
        t.literal('error')
      ])
    })
  },
  handler: async request => {
    const { dynamicIndexPattern } = await setupRequest(request);
    return { dynamicIndexPattern };
  }
}));
