/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler } from 'src/core/server';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';
import { RouteDependencies, ServerShim } from '../../../types';

/*
In order for the client to have the most up-to-date snapshot of the current license,
it needs to make a round-trip to the kibana server. This refresh endpoint is provided
for when the client needs to check the license, but doesn't need to pull data from the
server for any reason, i.e., when adding a new watch.
*/
export function registerRefreshRoute(deps: RouteDependencies, legacy: ServerShim) {
  const handler: RequestHandler<any, any, any> = (ctx, request, response) => {
    return response.ok({ body: { success: true } });
  };

  deps.router.get(
    {
      path: '/api/watcher/license/refresh',
      validate: false,
    },
    licensePreRoutingFactory(legacy, handler)
  );
}
