/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InternalCoreSetup } from 'src/core/server';
import { getAPMIndexPattern } from '../../lib/index_pattern';
import { APMRequest } from '../../lib/helpers/setup_request';
import { PromiseReturnType } from '../../../typings/common';

export type IndexPatternApiResponse = PromiseReturnType<
  typeof indexPatternRoute['handler']
>;

export const indexPatternRoute = {
  method: 'GET',
  path: '/api/apm/index_pattern',
  options: {
    tags: ['access:apm']
  },
  handler: async (req: APMRequest<{}>) => {
    return await getAPMIndexPattern(req.server);
  }
};

export function initIndexPatternApi(core: InternalCoreSetup) {
  const { server } = core.http;
  server.route(indexPatternRoute);
}
