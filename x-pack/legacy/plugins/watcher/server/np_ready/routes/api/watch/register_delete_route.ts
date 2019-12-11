/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RequestHandler } from 'src/core/server';
import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { isEsError } from '../../../lib/is_es_error';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';
import { RouteDependencies, ServerShim } from '../../../types';

function deleteWatch(callWithRequest: any, watchId: string) {
  return callWithRequest('watcher.deleteWatch', {
    id: watchId,
  });
}

export function registerDeleteRoute(deps: RouteDependencies, legacy: ServerShim) {
  const handler: RequestHandler<any, any, any> = async (ctx, request, response) => {
    const callWithRequest = callWithRequestFactory(deps.elasticsearchService, request);

    const { watchId } = request.params;

    try {
      await deleteWatch(callWithRequest, watchId);
      return response.noContent();
    } catch (e) {
      // Case: Error from Elasticsearch JS client
      if (isEsError(e)) {
        const body = e.statusCode === 404 ? `Watch with id = ${watchId} not found` : e;
        return response.customError({ statusCode: e.statusCode, body });
      }

      // Case: default
      return response.internalError({ body: e });
    }
  };

  deps.router.delete(
    {
      path: '/api/watcher/watch/{watchId}',
      validate: {
        params: schema.object({
          watchId: schema.string(),
        }),
      },
    },
    licensePreRoutingFactory(legacy, handler)
  );
}
