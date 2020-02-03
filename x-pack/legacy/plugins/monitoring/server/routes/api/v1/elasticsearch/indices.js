/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { getClusterStats } from '../../../../lib/cluster/get_cluster_stats';
import { getClusterStatus } from '../../../../lib/cluster/get_cluster_status';
import { getIndices } from '../../../../lib/elasticsearch/indices';
import { handleError } from '../../../../lib/errors/handle_error';
import { prefixIndexPattern } from '../../../../lib/ccs_utils';
import { INDEX_PATTERN_ELASTICSEARCH } from '../../../../../common/constants';
import { getIndicesUnassignedShardStats } from '../../../../lib/elasticsearch/shards/get_indices_unassigned_shard_stats';

export function esIndicesRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/elasticsearch/indices',
    config: {
      validate: {
        params: Joi.object({
          clusterUuid: Joi.string().required(),
        }),
        query: Joi.object({
          show_system_indices: Joi.boolean(),
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
      const { clusterUuid } = req.params;
      const { show_system_indices: showSystemIndices } = req.query;
      const { ccs } = req.payload;
      const esIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_ELASTICSEARCH, ccs);

      try {
        const clusterStats = await getClusterStats(req, esIndexPattern, clusterUuid);
        const indicesUnassignedShardStats = await getIndicesUnassignedShardStats(
          req,
          esIndexPattern,
          clusterStats
        );
        const indices = await getIndices(
          req,
          esIndexPattern,
          showSystemIndices,
          indicesUnassignedShardStats
        );

        return {
          clusterStatus: getClusterStatus(clusterStats, indicesUnassignedShardStats),
          indices,
        };
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
