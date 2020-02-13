/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ServerRoute } from 'hapi';
import { licensePreRoutingFactory } from './lib/license_pre_routing_factory';
import { Legacy } from '../../../../../kibana';
import { API_ROUTE_EXECUTE } from '../common/constants';

export function registerExecuteRoute(server: any) {
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: API_ROUTE_EXECUTE,
    method: 'POST',
    handler: (request: Legacy.Request) => {
      const cluster = server.plugins.elasticsearch.getCluster('data');
      return cluster
        .callWithRequest(request, 'scriptsPainlessExecute', {
          body: request.payload,
        })
        .catch((e: any) => {
          return e.body;
        });
    },
    config: {
      pre: [licensePreRouting],
    },
  } as ServerRoute);
}
