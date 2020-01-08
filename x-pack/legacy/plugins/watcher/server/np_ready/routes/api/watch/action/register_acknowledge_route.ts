/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { get } from 'lodash';
import { RequestHandler } from 'src/core/server';
import { callWithRequestFactory } from '../../../../lib/call_with_request_factory';
import { isEsError } from '../../../../lib/is_es_error';
import { licensePreRoutingFactory } from '../../../../lib/license_pre_routing_factory';
// @ts-ignore
import { WatchStatus } from '../../../../models/watch_status';
import { RouteDependencies, ServerShim } from '../../../../types';

function acknowledgeAction(callWithRequest: any, watchId: string, actionId: string) {
  return callWithRequest('watcher.ackWatch', {
    id: watchId,
    action: actionId,
  });
}

export function registerAcknowledgeRoute(deps: RouteDependencies, legacy: ServerShim) {
  const handler: RequestHandler<any, any, any> = async (ctx, request, response) => {
    const callWithRequest = callWithRequestFactory(deps.elasticsearchService, request);
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

  deps.router.put(
    {
      path: '/api/watcher/watch/{watchId}/action/{actionId}/acknowledge',
      validate: {
        params: schema.object({
          watchId: schema.string(),
          actionId: schema.string(),
        }),
      },
    },
    licensePreRoutingFactory(legacy, handler)
  );
}
