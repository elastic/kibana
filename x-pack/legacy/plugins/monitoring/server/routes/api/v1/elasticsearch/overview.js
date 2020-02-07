/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { getClusterStats } from '../../../../lib/cluster/get_cluster_stats';
import { getClusterStatus } from '../../../../lib/cluster/get_cluster_status';
import { getLastRecovery } from '../../../../lib/elasticsearch/get_last_recovery';
import { getMetrics } from '../../../../lib/details/get_metrics';
import { handleError } from '../../../../lib/errors/handle_error';
import { prefixIndexPattern } from '../../../../lib/ccs_utils';
import { metricSet } from './metric_set_overview';
import {
  INDEX_PATTERN_ELASTICSEARCH,
  INDEX_PATTERN_FILEBEAT,
} from '../../../../../common/constants';
import { getLogs } from '../../../../lib/logs';
import { getIndicesUnassignedShardStats } from '../../../../lib/elasticsearch/shards/get_indices_unassigned_shard_stats';

export function esOverviewRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/elasticsearch',
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
      const esIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_ELASTICSEARCH, ccs);
      const filebeatIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_FILEBEAT, '*');

      const start = req.payload.timeRange.min;
      const end = req.payload.timeRange.max;

      try {
        const [clusterStats, metrics, shardActivity, logs] = await Promise.all([
          getClusterStats(req, esIndexPattern, clusterUuid),
          getMetrics(req, esIndexPattern, metricSet),
          getLastRecovery(req, esIndexPattern),
          getLogs(config, req, filebeatIndexPattern, { clusterUuid, start, end }),
        ]);
        const indicesUnassignedShardStats = await getIndicesUnassignedShardStats(
          req,
          esIndexPattern,
          clusterStats
        );

        return {
          clusterStatus: getClusterStatus(clusterStats, indicesUnassignedShardStats),
          metrics,
          logs,
          shardActivity,
        };
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
