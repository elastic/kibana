/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../../lib/error_wrappers';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';

function deleteWatch(callWithRequest, watchId) {
  return callWithRequest('watcher.deleteWatch', {
    id: watchId,
  });
}

export function registerDeleteRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/watcher/watch/{watchId}',
    method: 'DELETE',
    handler: (request, h) => {
      const callWithRequest = callWithRequestFactory(server, request);

      const { watchId } = request.params;

      return deleteWatch(callWithRequest, watchId)
        .then(() => h.response().code(204))
        .catch(err => {
          // Case: Error from Elasticsearch JS client
          if (isEsError(err)) {
            const statusCodeToMessageMap = {
              404: `Watch with id = ${watchId} not found`,
            };
            throw wrapEsError(err, statusCodeToMessageMap);
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
