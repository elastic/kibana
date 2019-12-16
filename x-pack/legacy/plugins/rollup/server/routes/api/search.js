/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../lib/is_es_error_factory';
import { licensePreRoutingFactory } from '../../lib/license_pre_routing_factory';
import { wrapEsError, wrapUnknownError } from '../../lib/error_wrappers';

export function registerSearchRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/rollup/search',
    method: 'POST',
    config: {
      pre: [licensePreRouting],
    },
    handler: async request => {
      const callWithRequest = callWithRequestFactory(server, request);

      try {
        const requests = request.payload.map(({ index, query }) =>
          callWithRequest('rollup.search', {
            index,
            rest_total_hits_as_int: true,
            body: query,
          })
        );

        return await Promise.all(requests);
      } catch (err) {
        if (isEsError(err)) {
          return wrapEsError(err);
        }

        return wrapUnknownError(err);
      }
    },
  });
}
