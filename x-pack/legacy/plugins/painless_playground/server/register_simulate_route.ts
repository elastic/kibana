/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { licensePreRoutingFactory } from './lib/license_pre_routing_factory';
import { RequestFacade, ServerFacade } from '../../reporting/types';

export function registerSimulateRoute(server: ServerFacade) {
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/painless_playground/execute',
    method: 'POST',
    handler: (request: RequestFacade) => {
      const cluster = server.plugins.elasticsearch.getCluster('data');
      return cluster
        .callWithRequest(request, 'scriptsPainlessExecute', {
          body: request.payload,
        })
        .catch((e: Error) => {
          return e.body;
        });
    },
    config: {
      pre: [licensePreRouting],
    },
  });
}
