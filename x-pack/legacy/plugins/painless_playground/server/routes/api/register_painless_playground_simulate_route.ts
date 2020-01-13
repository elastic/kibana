/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { wrapEsError } from '../../lib/error_wrappers';
import { licensePreRoutingFactory } from '../../lib/license_pre_routing_factory';
import { ServerFacade, RequestFacade } from '../../../types';

export function registerPainlessPlaygroundSimulateRoute(server: ServerFacade) {
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/painless_playground/simulate',
    method: 'POST',
    handler: (request: RequestFacade) => {
      const cluster = server.plugins.elasticsearch.getCluster('data');
      return cluster
        .callWithRequest(request, 'scriptsPainlessExecute', {
          body: request.payload,
        })
        .catch((e: any) => wrapEsError(e));
    },
    config: {
      pre: [licensePreRouting],
    },
  });
}
