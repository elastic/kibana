/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import Boom from 'boom';
import { setupRequest } from '../lib/helpers/setup_request';
import { createRoute } from './create_route';
import { uiFiltersRt, rangeRt } from './default_api_types';
import { getServiceMap } from '../lib/service_map/get_service_map';

export const serviceMapRoute = createRoute(() => ({
  path: '/api/apm/service-map',
  params: {
    query: t.intersection([
      t.partial({ environment: t.string, serviceName: t.string }),
      uiFiltersRt,
      rangeRt
    ])
  },
  handler: async ({ context, request }) => {
    if (!context.config['xpack.apm.serviceMapEnabled']) {
      return new Boom('Not found', { statusCode: 404 });
    }
    const setup = await setupRequest(context, request);
    const {
      query: { serviceName, environment }
    } = context.params;
    return getServiceMap({ setup, serviceName, environment });
  }
}));
