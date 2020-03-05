/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import Joi from 'joi';
import { getClusterStats } from '../../../../lib/cluster/get_cluster_stats';
import { getNodeSummary } from '../../../../lib/elasticsearch/nodes';
import { getShardStats, getShardAllocation } from '../../../../lib/elasticsearch/shards';
import { getMetrics } from '../../../../lib/details/get_metrics';
import { handleError } from '../../../../lib/errors/handle_error';
import { prefixIndexPattern } from '../../../../lib/ccs_utils';
import { metricSets } from './metric_set_node_detail';
import { INDEX_PATTERN_ELASTICSEARCH } from '../../../../../common/constants';
import { getLogs } from '../../../../lib/logs/get_logs';

const { advanced: metricSetAdvanced, overview: metricSetOverview } = metricSets;

export function esNodeRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/elasticsearch/nodes/{nodeUuid}',
    config: {
      validate: {
        params: Joi.object({
          clusterUuid: Joi.string().required(),
          nodeUuid: Joi.string().required(),
        }),
        payload: Joi.object({
          ccs: Joi.string().optional(),
          showSystemIndices: Joi.boolean().default(false), // show/hide system indices in shard allocation table
          timeRange: Joi.object({
            min: Joi.date().required(),
            max: Joi.date().required(),
          }).required(),
          is_advanced: Joi.boolean().required(),
        }),
      },
    },
    async handler(req) {
      const config = server.config();
      const ccs = req.payload.ccs;
      const showSystemIndices = req.payload.showSystemIndices;
      const clusterUuid = req.params.clusterUuid;
      const nodeUuid = req.params.nodeUuid;
      const start = req.payload.timeRange.min;
      const end = req.payload.timeRange.max;
      const esIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_ELASTICSEARCH, ccs);
      const filebeatIndexPattern = prefixIndexPattern(
        config,
        config.get('monitoring.ui.logs.index'),
        '*'
      );
      const isAdvanced = req.payload.is_advanced;

      let metricSet;
      if (isAdvanced) {
        metricSet = metricSetAdvanced;
      } else {
        metricSet = metricSetOverview;
        // set the cgroup option if needed
        const showCgroupMetricsElasticsearch = config.get(
          'monitoring.ui.container.elasticsearch.enabled'
        );
        const metricCpu = metricSet.find(m => m.name === 'node_cpu_metric');
        if (showCgroupMetricsElasticsearch) {
          metricCpu.keys = ['node_cgroup_quota_as_cpu_utilization'];
        } else {
          metricCpu.keys = ['node_cpu_utilization'];
        }
      }

      try {
        const cluster = await getClusterStats(req, esIndexPattern, clusterUuid);

        const clusterState = get(cluster, 'cluster_state', { nodes: {} });
        const shardStats = await getShardStats(req, esIndexPattern, cluster, {
          includeIndices: true,
          includeNodes: true,
          nodeUuid,
        });
        const nodeSummary = await getNodeSummary(req, esIndexPattern, clusterState, shardStats, {
          clusterUuid,
          nodeUuid,
          start,
          end,
        });
        const metrics = await getMetrics(req, esIndexPattern, metricSet, [
          { term: { 'source_node.uuid': nodeUuid } },
        ]);

        let logs;
        let shardAllocation;
        if (!isAdvanced) {
          // TODO: Why so many fields needed for a single component (shard legend)?
          const shardFilter = { term: { 'shard.node': nodeUuid } };
          const stateUuid = get(cluster, 'cluster_state.state_uuid');
          const allocationOptions = {
            shardFilter,
            stateUuid,
            showSystemIndices,
          };
          const shards = await getShardAllocation(req, esIndexPattern, allocationOptions);

          shardAllocation = {
            shards,
            shardStats: { indices: shardStats.indices },
            nodes: shardStats.nodes, // for identifying nodes that shard relocates to
            stateUuid, // for debugging/troubleshooting
          };

          logs = await getLogs(config, req, filebeatIndexPattern, {
            clusterUuid,
            nodeUuid,
            start,
            end,
          });
        }

        return {
          nodeSummary,
          metrics,
          logs,
          ...shardAllocation,
        };
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
