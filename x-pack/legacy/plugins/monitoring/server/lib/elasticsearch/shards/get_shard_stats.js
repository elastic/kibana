/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { checkParam } from '../../error_missing_required';
import { createQuery } from '../../create_query';
import { ElasticsearchMetric } from '../../metrics';
import { normalizeIndexShards, normalizeNodeShards } from './normalize_shard_objects';
import { getShardAggs } from './get_shard_stat_aggs';
import { calculateIndicesTotals } from './calculate_shard_stat_indices_totals';

export function handleResponse(resp, includeNodes, includeIndices, cluster) {
  let indices;
  let indicesTotals;
  let nodes;

  const buckets = get(resp, 'aggregations.indices.buckets');
  if (buckets && buckets.length !== 0) {
    indices = buckets.reduce(normalizeIndexShards, {});
    indicesTotals = calculateIndicesTotals(indices);
  }

  if (includeNodes) {
    const masterNode = get(cluster, 'cluster_state.master_node');
    nodes = resp.aggregations.nodes.buckets.reduce(normalizeNodeShards(masterNode), {});
  }

  return {
    indicesTotals,
    indices: includeIndices ? indices : undefined,
    nodes,
  };
}

export function getShardStats(
  req,
  esIndexPattern,
  cluster,
  { includeNodes = false, includeIndices = false } = {}
) {
  checkParam(esIndexPattern, 'esIndexPattern in elasticsearch/getShardStats');

  const config = req.server.config();
  const metric = ElasticsearchMetric.getMetricFields();
  const params = {
    index: esIndexPattern,
    size: 0,
    ignoreUnavailable: true,
    body: {
      sort: { timestamp: { order: 'desc' } },
      query: createQuery({
        type: 'shards',
        clusterUuid: cluster.cluster_uuid,
        metric,
        filters: [{ term: { state_uuid: get(cluster, 'cluster_state.state_uuid') } }],
      }),
      aggs: {
        ...getShardAggs(config, includeNodes, includeIndices),
      },
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  return callWithRequest(req, 'search', params).then(resp => {
    return handleResponse(resp, includeNodes, includeIndices, cluster);
  });
}
