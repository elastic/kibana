/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { checkParam } from '../../error_missing_required';
import { createQuery } from '../../create_query';
import { ElasticsearchMetric } from '../../metrics';

async function getShardCountPerNode(req, esIndexPattern, cluster) {
  const config = req.server.config();
  const maxBucketSize = config.get('xpack.monitoring.max_bucket_size');
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
        nodes: {
          terms: {
            field: 'shard.node',
            size: maxBucketSize,
          },
        },
      },
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  return await callWithRequest(req, 'search', params);
}

export async function getNodesShardCount(req, esIndexPattern, cluster) {
  checkParam(esIndexPattern, 'esIndexPattern in elasticsearch/getShardStats');

  const response = await getShardCountPerNode(req, esIndexPattern, cluster);
  const nodes = get(response, 'aggregations.nodes.buckets', []).reduce((accum, bucket) => {
    accum[bucket.key] = { shardCount: bucket.doc_count };
    return accum;
  }, {});
  return { nodes };
}
