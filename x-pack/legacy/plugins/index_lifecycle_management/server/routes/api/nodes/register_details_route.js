/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../../lib/error_wrappers';
import { licensePreRoutingFactory } from'../../../lib/license_pre_routing_factory';

function findMatchingNodes(stats, nodeAttrs) {
  return Object.entries(stats.nodes).reduce((accum, [nodeId, stats]) => {
    const attributes = stats.attributes || {};
    for (const [key, value] of Object.entries(attributes)) {
      if (`${key}:${value}` === nodeAttrs) {
        accum.push({
          nodeId,
          stats,
        });
        break;
      }
    }
    return accum;
  }, []);
}

async function fetchNodeStats(callWithRequest) {
  const params = {
    format: 'json'
  };

  return await callWithRequest('nodes.stats', params);
}

export function registerDetailsRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/index_lifecycle_management/nodes/{nodeAttrs}/details',
    method: 'GET',
    handler: async (request) => {
      const callWithRequest = callWithRequestFactory(server, request);

      try {
        const stats = await fetchNodeStats(callWithRequest);
        const response = findMatchingNodes(stats, request.params.nodeAttrs);
        return response;
      } catch (err) {
        if (isEsError(err)) {
          return wrapEsError(err);
        }

        return wrapUnknownError(err);
      }
    },
    config: {
      pre: [ licensePreRouting ]
    }
  });
}
