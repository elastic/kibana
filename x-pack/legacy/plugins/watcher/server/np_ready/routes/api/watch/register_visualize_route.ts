/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler } from 'src/core/server';
import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { Watch } from '../../../models/watch';
import { VisualizeOptions } from '../../../models/visualize_options';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';
import { ServerShimWithRouter } from '../../../types';

function fetchVisualizeData(callWithRequest: any, index: any, body: any) {
  const params = {
    index,
    body,
    ignoreUnavailable: true,
    allowNoIndices: true,
    ignore: [404],
  };

  return callWithRequest('search', params);
}

export function registerVisualizeRoute(server: ServerShimWithRouter) {
  const isEsError = isEsErrorFactory(server);
  const handler: RequestHandler<any, any, any> = async (ctx, request, response) => {
    const callWithRequest = callWithRequestFactory(server, request);
    const watch = Watch.fromDownstreamJson(request.payload.watch);
    const options = VisualizeOptions.fromDownstreamJson(request.payload.options);
    const body = watch.getVisualizeQuery(options);

    try {
      const hits = await fetchVisualizeData(callWithRequest, watch.index, body);
      const visualizeData = watch.formatVisualizeData(hits);

      return response.ok({
        body: {
          visualizeData,
        },
      });
    } catch (e) {
      // Case: Error from Elasticsearch JS client
      if (isEsError(e)) {
        return response.customError({ statusCode: e.statusCode, body: e });
      }

      // Case: default
      return response.internalError({ body: e });
    }
  };

  server.router.post(
    {
      path: '/api/watcher/watch/visualize',
      validate: false,
    },
    licensePreRoutingFactory(server, handler)
  );
}
