/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { Watch } from '../../../models/watch';
import { VisualizeOptions } from '../../../models/visualize_options';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../../lib/error_wrappers';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';

function fetchVisualizeData(callWithRequest, index, body) {
  const params = {
    index,
    body,
    ignoreUnavailable: true,
    allowNoIndices: true,
    ignore: [404],
  };

  return callWithRequest('search', params);
}

export function registerVisualizeRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/watcher/watch/visualize',
    method: 'POST',
    handler: request => {
      const callWithRequest = callWithRequestFactory(server, request);
      const watch = Watch.fromDownstreamJson(request.payload.watch);
      const options = VisualizeOptions.fromDownstreamJson(request.payload.options);
      const body = watch.getVisualizeQuery(options);

      return fetchVisualizeData(callWithRequest, watch.index, body)
        .then(hits => {
          const visualizeData = watch.formatVisualizeData(hits);

          return {
            visualizeData,
          };
        })
        .catch(err => {
          // Case: Error from Elasticsearch JS client
          if (isEsError(err)) {
            throw wrapEsError(err);
          }

          // Case: default
          throw wrapUnknownError(err);
        });
    },
    config: {
      pre: [licensePreRouting],
    },
  });
}
