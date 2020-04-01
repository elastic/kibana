/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { isEsError } from '../../../lib/is_es_error';
import { wrapEsError, wrapUnknownError } from '../../../lib/error_wrappers';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';
import { NODE_ATTRS_KEYS_TO_IGNORE } from './constants';

function convertStatsIntoList(stats: any, attributesToBeFiltered: string[]): any {
  return Object.entries(stats.nodes).reduce((accum: any, [nodeId, nodeStats]: [any, any]) => {
    const attributes = nodeStats.attributes || {};
    for (const [key, value] of Object.entries(attributes)) {
      if (!attributesToBeFiltered.includes(key)) {
        const attributeString = `${key}:${value}`;
        accum[attributeString] = accum[attributeString] || [];
        accum[attributeString].push(nodeId);
      }
    }
    return accum;
  }, {});
}

async function fetchNodeStats(callWithRequest: any): Promise<any> {
  const params = {
    format: 'json',
  };

  return await callWithRequest('nodes.stats', params);
}

export function registerListRoute(server: any) {
  const config = server.config();
  const filteredNodeAttributes = config.get('xpack.ilm.filteredNodeAttributes');
  const attributesToBeFiltered = [...NODE_ATTRS_KEYS_TO_IGNORE, ...filteredNodeAttributes];
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/index_lifecycle_management/nodes/list',
    method: 'GET',
    handler: async (request: any) => {
      const callWithRequest = callWithRequestFactory(server, request);

      try {
        const stats = await fetchNodeStats(callWithRequest);
        const response = convertStatsIntoList(stats, attributesToBeFiltered);
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
