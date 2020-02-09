/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { prefixIndexPattern } from '../../../../lib/ccs_utils';
import { getMetrics } from '../../../../lib/details/get_metrics';
import { getLatestStats, getStats } from '../../../../lib/beats';
import { handleError } from '../../../../lib/errors';
import { metricSet } from './metric_set_overview';
import { INDEX_PATTERN_BEATS } from '../../../../../common/constants';

export function beatsOverviewRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/beats',
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
      const beatsIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_BEATS, ccs);

      try {
        const [latest, stats, metrics] = await Promise.all([
          getLatestStats(req, beatsIndexPattern, clusterUuid),
          getStats(req, beatsIndexPattern, clusterUuid),
          getMetrics(req, beatsIndexPattern, metricSet),
        ]);

        return {
          ...latest,
          stats,
          metrics,
        };
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
