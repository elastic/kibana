/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { prefixIndexPattern } from '../../../../lib/ccs_utils';
import { getKibanaClusterStatus } from './_get_kibana_cluster_status';
import { getMetrics } from '../../../../lib/details/get_metrics';
import { metricSet } from './metric_set_overview';
import { handleError } from '../../../../lib/errors';
import { INDEX_PATTERN_KIBANA } from '../../../../../common/constants';

export function kibanaOverviewRoute(server) {
  /**
   * Kibana overview (metrics)
   */
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/kibana',
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
      const kbnIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_KIBANA, ccs);

      try {
        const [clusterStatus, metrics] = await Promise.all([
          getKibanaClusterStatus(req, kbnIndexPattern, { clusterUuid }),
          getMetrics(req, kbnIndexPattern, metricSet),
        ]);

        return {
          clusterStatus,
          metrics,
        };
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
