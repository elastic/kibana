/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RequestHandler } from 'src/core/server';
import { get } from 'lodash';
import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { isEsError } from '../../../lib/is_es_error';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';
// @ts-ignore
import { Watch } from '../../../models/watch';
import { RouteDependencies, ServerShim } from '../../../types';

function fetchWatch(callWithRequest: any, watchId: string) {
  return callWithRequest('watcher.getWatch', {
    id: watchId,
  });
}

export function registerLoadRoute(deps: RouteDependencies, legacy: ServerShim) {
  const handler: RequestHandler<any, any, any> = async (ctx, request, response) => {
    const callWithRequest = callWithRequestFactory(deps.elasticsearchService, request);

    const id = request.params.id;

    try {
      const hit = await fetchWatch(callWithRequest, id);
      const watchJson = get(hit, 'watch');
      const watchStatusJson = get(hit, 'status');
      const json = {
        id,
        watchJson,
        watchStatusJson,
      };

      const watch = Watch.fromUpstreamJson(json, {
        throwExceptions: {
          Action: false,
        },
      });
      return response.ok({
        body: { watch: watch.downstreamJson },
      });
    } catch (e) {
      // Case: Error from Elasticsearch JS client
      if (isEsError(e)) {
        const body = e.statusCode === 404 ? `Watch with id = ${id} not found` : e;
        return response.customError({ statusCode: e.statusCode, body });
      }

      // Case: default
      return response.internalError({ body: e });
    }
  };
  deps.router.get(
    {
      path: '/api/watcher/watch/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    licensePreRoutingFactory(legacy, handler)
  );
}
