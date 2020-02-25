/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { getClusterStatus } from '../../../../lib/logstash/get_cluster_status';
import { getMetrics } from '../../../../lib/details/get_metrics';
import { handleError } from '../../../../lib/errors';
import { prefixIndexPattern } from '../../../../lib/ccs_utils';
import { metricSet } from './metric_set_overview';
import { INDEX_PATTERN_LOGSTASH } from '../../../../../common/constants';

/*
 * Logstash Overview route.
 */
export function logstashOverviewRoute(server) {
  /**
   * Logstash Overview request.
   *
   * This will fetch all data required to display the Logstash Overview page.
   *
   * The current details returned are:
   *
   * - Logstash Cluster Status
   * - Metrics
   */
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/logstash',
    config: {
      validate: {
        params: Joi.object({
          clusterUuid: Joi.string().required(),
        }),
        payload: Joi.object({
          ccs: Joi.string().optional(),
          timeRange: Joi.object({
            min: Joi.date().required(),
            max: Joi.date().required(),
          }).required(),
        }),
      },
    },
    async handler(req) {
      const config = server.config();
      const ccs = req.payload.ccs;
      const clusterUuid = req.params.clusterUuid;
      const lsIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_LOGSTASH, ccs);

      try {
        const [metrics, clusterStatus] = await Promise.all([
          getMetrics(req, lsIndexPattern, metricSet),
          getClusterStatus(req, lsIndexPattern, { clusterUuid }),
        ]);

        return {
          metrics,
          clusterStatus,
        };
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
