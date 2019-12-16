/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { getKibanaInfo } from '../../../../lib/kibana/get_kibana_info';
import { handleError } from '../../../../lib/errors';
import { getMetrics } from '../../../../lib/details/get_metrics';
import { prefixIndexPattern } from '../../../../lib/ccs_utils';
import { metricSet } from './metric_set_instance';
import { INDEX_PATTERN_KIBANA } from '../../../../../common/constants';

/**
 * Kibana instance: This will fetch all data required to display a Kibana
 * instance's page. The current details returned are:
 * - Kibana Instance Summary (Status)
 * - Metrics
 */
export function kibanaInstanceRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/kibana/{kibanaUuid}',
    config: {
      validate: {
        params: Joi.object({
          clusterUuid: Joi.string().required(),
          kibanaUuid: Joi.string().required(),
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
      const kibanaUuid = req.params.kibanaUuid;
      const kbnIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_KIBANA, ccs);

      try {
        const [metrics, kibanaSummary] = await Promise.all([
          getMetrics(req, kbnIndexPattern, metricSet),
          getKibanaInfo(req, kbnIndexPattern, { clusterUuid, kibanaUuid }),
        ]);

        return {
          metrics,
          kibanaSummary,
        };
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
