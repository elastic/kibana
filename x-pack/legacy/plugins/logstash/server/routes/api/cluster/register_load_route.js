/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { Cluster } from '../../../models/cluster';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';

function fetchCluster(callWithRequest) {
  return callWithRequest('info');
}

export function registerLoadRoute(server) {
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/logstash/cluster',
    method: 'GET',
    handler: (request, h) => {
      const callWithRequest = callWithRequestFactory(server, request);

      return fetchCluster(callWithRequest)
        .then(responseFromES => ({
          cluster: Cluster.fromUpstreamJSON(responseFromES).downstreamJSON,
        }))
        .catch(e => {
          if (e.status === 403) {
            return h.response();
          }
          throw Boom.internal(e);
        });
    },
    config: {
      pre: [licensePreRouting],
    },
  });
}
