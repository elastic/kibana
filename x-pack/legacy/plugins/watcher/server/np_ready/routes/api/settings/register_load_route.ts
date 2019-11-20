/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler } from 'src/core/server';
import { callWithInternalUserFactory } from '../../../lib/call_with_internal_user_factory';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';
// @ts-ignore
import { Settings } from '../../../models/settings';
import { ServerShimWithRouter } from '../../../types';

function fetchClusterSettings(callWithInternalUser: any) {
  return callWithInternalUser('cluster.getSettings', {
    includeDefaults: true,
    filterPath: '**.xpack.notification',
  });
}

export function registerLoadRoute(server: ServerShimWithRouter) {
  const isEsError = isEsErrorFactory(server);
  const handler: RequestHandler<any, any, any> = async (ctx, request, response) => {
    try {
      const settings = await fetchClusterSettings(callWithInternalUser);
      return response.ok({ body: Settings.fromUpstreamJson(settings).downstreamJson });
    } catch (e) {
      // Case: Error from Elasticsearch JS client
      if (isEsError(e)) {
        return response.customError({ statusCode: e.statusCode, body: e });
      }

      // Case: default
      return response.internalError({ body: e });
    }
  };
  const callWithInternalUser = callWithInternalUserFactory(server);

  server.router.get(
    {
      path: '/api/watcher/settings',
      validate: false,
    },
    licensePreRoutingFactory(server, handler)
  );
}
