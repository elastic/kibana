/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { handleError } from '../../../../../lib/errors';
import { prefixIndexPattern } from '../../../../../lib/ccs_utils';
import { INDEX_PATTERN_LOGSTASH } from '../../../../../../common/constants';
import { getLogstashPipelineIds } from '../../../../../lib/logstash/get_pipeline_ids';

/**
 * Retrieve pipelines for a cluster
 */
export function logstashClusterPipelineIdsRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/logstash/pipeline_ids',
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
    handler: async req => {
      const config = server.config();
      const { ccs } = req.payload;
      const clusterUuid = req.params.clusterUuid;
      const lsIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_LOGSTASH, ccs);
      const size = config.get('xpack.monitoring.max_bucket_size');

      try {
        const pipelines = await getLogstashPipelineIds(req, lsIndexPattern, { clusterUuid }, size);
        return pipelines;
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
