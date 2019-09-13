/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getAPMIndexPattern } from '../lib/index_pattern';
import { createRoute } from './create_route';

export const indexPatternRoute = createRoute(core => ({
  path: '/api/apm/index_pattern',
  handler: async () => {
    const { server } = core.http;
    return await getAPMIndexPattern(server);
  }
}));
