/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RequestHandler } from 'src/core/server';
import { get } from 'lodash';
import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';
import { NPServer, ServerShim } from '../../../types';
// @ts-ignore
import { WatchStatus } from '../../../models/watch_status';

function activateWatch(callWithRequest: any, watchId: string) {
  return callWithRequest('watcher.activateWatch', {
    id: watchId,
  });
}

export function registerActivateRoute(server: NPServer, legacy: ServerShim) {
  const isEsError = isEsErrorFactory(legacy);
  const handler: RequestHandler<any, any, any> = async (ctx, request, response) => {
    const callWithRequest = callWithRequestFactory(legacy, request);

    const { watchId } = request.params;

    try {
      const hit = await activateWatch(callWithRequest, watchId);
      const watchStatusJson = get(hit, 'status');
      const json = {
        id: watchId,
        watchStatusJson,
      };

      const watchStatus = WatchStatus.fromUpstreamJson(json);
      return response.ok({
        body: {
          watchStatus: watchStatus.downstreamJson,
        },
      });
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

  server.router.put(
    {
      path: '/api/watcher/watch/{watchId}/activate',
      validate: {
        params: schema.object({
          watchId: schema.string(),
        }),
      },
    },
    licensePreRoutingFactory(legacy, handler)
  );
}
