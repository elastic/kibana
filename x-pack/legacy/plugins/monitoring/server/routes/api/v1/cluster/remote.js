/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleError } from '../../../../lib/errors';

export function clusterRemoteInfoRoute(server) {
  /*
   * Cluster remoteInfo
   */
  server.route({
    method: 'GET',
    path: '/api/monitoring/v1/clusters/remote_info',
    handler: (req) => {
      const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
      return callWithRequest(req, 'cluster.remoteInfo').catch(err => handleError(err, req));
    }
  });
}
