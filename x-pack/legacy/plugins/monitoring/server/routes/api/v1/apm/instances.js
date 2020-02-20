/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { prefixIndexPattern } from '../../../../lib/ccs_utils';
import { getStats, getApms } from '../../../../lib/apm';
import { handleError } from '../../../../lib/errors';
import { INDEX_PATTERN_BEATS } from '../../../../../common/constants';

export function apmInstancesRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/apm/instances',
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
        const [stats, apms] = await Promise.all([
          getStats(req, apmIndexPattern, clusterUuid),
          getApms(req, apmIndexPattern, clusterUuid),
        ]);

        return {
          stats,
          apms,
        };
      } catch (err) {
        return handleError(err, req);
      }
    },
  });
}
