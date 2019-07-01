/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Joi from 'joi';
import { verifyMonitoringAuth } from '../../../../lib/elasticsearch/verify_monitoring_auth';
import { handleError } from '../../../../lib/errors';
import { getCollectionStatus } from '../../../../lib/setup/collection';
import { getIndexPatterns } from '../../../../lib/cluster/get_index_patterns';

export function clustersSetupStatusRoute(server) {
  /*
   * Monitoring Home
   * Route Init (for checking license and compatibility for multi-cluster monitoring
   */
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/setup/collection',
    config: {
      validate: {
        payload: Joi.object({
          timeRange: Joi.object({
            min: Joi.date().required(),
            max: Joi.date().required()
          }).optional()
        }).allow(null)
      }
    },
    handler: async (req) => {
      let status = null;

      // NOTE using try/catch because checkMonitoringAuth is expected to throw
      // an error when current logged-in user doesn't have permission to read
      // the monitoring data. `try/catch` makes it a little more explicit.
      try {
        await verifyMonitoringAuth(req);
        const indexPatterns = getIndexPatterns(server);
        status = await getCollectionStatus(req, indexPatterns);
      } catch (err) {
        throw handleError(err, req);
      }

      return status;
    }
  });
}
