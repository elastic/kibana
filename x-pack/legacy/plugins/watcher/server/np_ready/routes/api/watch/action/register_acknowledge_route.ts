/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { get } from 'lodash';
import { RequestHandler } from 'kibana/server';
import { callWithRequestFactory } from '../../../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../../../lib/is_es_error_factory';
import { licensePreRoutingFactory } from '../../../../lib/license_pre_routing_factory';
// @ts-ignore
import { WatchStatus } from '../../../../models/watch_status';
import { ServerShimWithRouter } from '../../../../types';

function acknowledgeAction(callWithRequest: any, watchId: string, actionId: string) {
  return callWithRequest('watcher.ackWatch', {
    id: watchId,
    action: actionId,
  });
}

export function registerAcknowledgeRoute(server: ServerShimWithRouter) {
  const isEsError = isEsErrorFactory(server);
  const handler: RequestHandler<any, any, any> = async (ctx, request, response) => {
    const callWithRequest = callWithRequestFactory(server, request);
    const { watchId, actionId } = request.params;

    try {
      const hit = await acknowledgeAction(callWithRequest, watchId, actionId);
      const watchStatusJson = get(hit, 'status');
      const json = {
        id: watchId,
        watchStatusJson,
      };

      const watchStatus = WatchStatus.fromUpstreamJson(json);
      return response.ok({
        body: { watchStatus: watchStatus.downstreamJson },
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
      path: '/api/watcher/watch/{watchId}/action/{actionId}/acknowledge',
      validate: {
        params: schema.object({
          watchId: schema.string(),
          actionId: schema.string(),
        }),
      },
    },
    licensePreRoutingFactory(server, handler)
  );
}
