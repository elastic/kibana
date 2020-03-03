/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { getClustersFromRequest } from '../../../../lib/cluster/get_clusters_from_request';
import { verifyMonitoringAuth } from '../../../../lib/elasticsearch/verify_monitoring_auth';
import { verifyCcsAvailability } from '../../../../lib/elasticsearch/verify_ccs_availability';
import { handleError } from '../../../../lib/errors';
import { getIndexPatterns } from '../../../../lib/cluster/get_index_patterns';

export function clustersRoute(server) {
  /*
   * Monitoring Home
   * Route Init (for checking license and compatibility for multi-cluster monitoring
   */
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters',
    config: {
      validate: {
        payload: Joi.object({
          timeRange: Joi.object({
            min: Joi.date().required(),
            max: Joi.date().required(),
          }).required(),
          codePaths: Joi.array()
            .items(Joi.string().required())
            .required(),
        }),
      },
    },
    handler: async req => {
      const config = server.config();
      let clusters = [];

      // NOTE using try/catch because checkMonitoringAuth is expected to throw
      // an error when current logged-in user doesn't have permission to read
      // the monitoring data. `try/catch` makes it a little more explicit.
      try {
        await verifyMonitoringAuth(req);
        await verifyCcsAvailability(req);
        const indexPatterns = getIndexPatterns(server, {
          filebeatIndexPattern: config.get('monitoring.ui.logs.index'),
        });
        clusters = await getClustersFromRequest(req, indexPatterns, {
          codePaths: req.payload.codePaths,
        });
      } catch (err) {
        throw handleError(err, req);
      }

      return clusters;
    },
  });
}
