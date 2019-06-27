/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleError } from '../../../../lib/errors/handle_error';
import { getLivesNodes } from '../../../../lib/elasticsearch/nodes/get_nodes/get_live_nodes';

// TODO: can this go away? I don't think the client needs it anymore
export function liveEsNodesRoute(server) {
  server.route({
    method: 'GET',
    path: '/api/monitoring/v1/live/elasticsearch/nodes',
    async handler(req) {
      try {
        const nodes = await getLivesNodes(req);
        return { nodes };
      } catch(err) {
        throw handleError(err, req);
      }
    }
  });

}
