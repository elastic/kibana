/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { getClusterStats } from '../../../../lib/cluster/get_cluster_stats';
import { getClusterStatus } from '../../../../lib/cluster/get_cluster_status';
import { getNodes } from '../../../../lib/elasticsearch/nodes';
import { getShardStats } from '../../../../lib/elasticsearch/shards';
import { handleError } from '../../../../lib/errors/handle_error';
import { prefixIndexPattern } from '../../../../lib/ccs_utils';
import { INDEX_PATTERN_ELASTICSEARCH } from '../../../../../common/constants';
import { getPaginatedNodes } from '../../../../lib/elasticsearch/nodes/get_nodes/get_paginated_nodes';
import { LISTING_METRICS_NAMES } from '../../../../lib/elasticsearch/nodes/get_nodes/nodes_listing_metrics';

export function esNodesRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/elasticsearch/nodes',
    config: {
      validate: {
        params: Joi.object({
          clusterUuid: Joi.string().required()
        }),
        payload: Joi.object({
          ccs: Joi.string().optional(),
          timeRange: Joi.object({
            min: Joi.date().required(),
            max: Joi.date().required()
          }).required(),
          pagination: Joi.object({
            index: Joi.number().required(),
            size: Joi.number().required()
          }).required(),
          sort: Joi.object({
            field: Joi.string().required(),
            direction: Joi.string().required()
          }).optional(),
          queryText: Joi.string().default('').allow('').optional(),
        })
      }
    },
    async handler(req) {
      const config = server.config();
      const { ccs, pagination, sort, queryText } = req.payload;
      const clusterUuid = req.params.clusterUuid;
      const esIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_ELASTICSEARCH, ccs);

      const times = [];


      times.push({ id: 'start', time: +new Date() });

      try {
        const clusterStats = await getClusterStats(req, esIndexPattern, clusterUuid);
        times.push({ id: 'cluster stats', time: +new Date() });
        const shardStats = await getShardStats(req, esIndexPattern, clusterStats, { includeNodes: true });
        times.push({ id: 'shard stats', time: +new Date() });
        const clusterStatus = getClusterStatus(clusterStats, shardStats);
        times.push({ id: 'cluster stats', time: +new Date() });

        const metricSet = LISTING_METRICS_NAMES;
        const { pageOfNodes, totalNodeCount } = await getPaginatedNodes(
          req, esIndexPattern, { clusterUuid }, metricSet, pagination, sort, queryText,
          {
            clusterStats,
            shardStats,
          }
        );
        times.push({ id: 'paginated nodes', time: +new Date() });

        const nodes = await getNodes(req, esIndexPattern, pageOfNodes, clusterStats, shardStats);
        times.push({ id: 'nodes', time: +new Date() });
        for (let i = 0; i < times.length; i++) {
          const thisOne = times[i];
          const lastOne = i > 0 ? times[i - 1] : null;
          if (!lastOne) {
            continue;
          }
          console.log(`From ${thisOne.id} to ${lastOne.id} took ${thisOne.time - lastOne.time}ms...`);
        }
        return { clusterStatus, nodes, totalNodeCount };
      } catch(err) {
        throw handleError(err, req);
      }
    }
  });

}
