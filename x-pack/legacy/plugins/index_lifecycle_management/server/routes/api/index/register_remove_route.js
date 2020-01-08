/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../../lib/error_wrappers';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';

async function removeLifecycle(callWithRequest, indexNames) {
  const responses = [];
  for (let i = 0; i < indexNames.length; i++) {
    const indexName = indexNames[i];
    const params = {
      method: 'POST',
      path: `/${encodeURIComponent(indexName)}/_ilm/remove`,
      ignore: [404],
    };

    responses.push(callWithRequest('transport.request', params));
  }
  return Promise.all(responses);
}

export function registerRemoveRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/index_lifecycle_management/index/remove',
    method: 'POST',
    handler: async request => {
      const callWithRequest = callWithRequestFactory(server, request);

      try {
        const response = await removeLifecycle(callWithRequest, request.payload.indexNames);
        return response;
      } catch (err) {
        if (isEsError(err)) {
          return wrapEsError(err);
        }

        return wrapUnknownError(err);
      }
    },
    config: {
      pre: [licensePreRouting],
    },
  });
}
