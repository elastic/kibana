/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../../lib/error_wrappers';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';
import { WatchStatus } from '../../../models/watch_status';

function deactivateWatch(callWithRequest, watchId) {
  return callWithRequest('watcher.deactivateWatch', {
    id: watchId,
  });
}

export function registerDeactivateRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/watcher/watch/{watchId}/deactivate',
    method: 'PUT',
    handler: request => {
      const callWithRequest = callWithRequestFactory(server, request);

      const { watchId } = request.params;

      return deactivateWatch(callWithRequest, watchId)
        .then(hit => {
          const watchStatusJson = get(hit, 'status');
          const json = {
            id: watchId,
            watchStatusJson: watchStatusJson,
          };

          const watchStatus = WatchStatus.fromUpstreamJson(json);
          return {
            watchStatus: watchStatus.downstreamJson,
          };
        })
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
