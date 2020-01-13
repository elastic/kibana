/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { prefixIndexPattern } from '../../../../lib/ccs_utils';
import { getMetrics } from '../../../../lib/details/get_metrics';
import { metricSet } from './metric_set_overview';
import { handleError } from '../../../../lib/errors';
import { getApmClusterStatus } from './_get_apm_cluster_status';
import { INDEX_PATTERN_BEATS } from '../../../../../common/constants';

export function apmOverviewRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/apm',
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
      const apmIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_BEATS, ccs);

      try {
        const [stats, metrics] = await Promise.all([
          getApmClusterStatus(req, apmIndexPattern, { clusterUuid }),
          getMetrics(req, apmIndexPattern, metricSet),
        ]);

        return {
          stats,
          metrics,
        };
      } catch (err) {
        return handleError(err, req);
      }
    },
  });
}
