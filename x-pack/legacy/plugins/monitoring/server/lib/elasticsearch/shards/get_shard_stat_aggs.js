/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * @param {Object} config - Kibana config service
 * @param {Boolean} includeNodes - whether to add the aggs for node shards
 */
export function getShardAggs(config, includeNodes, includeIndices) {
  const maxBucketSize = config.get('xpack.monitoring.max_bucket_size');
  const aggSize = 10;
  const indicesAgg = {
    terms: {
      field: 'shard.index',
      size: maxBucketSize,
    },
    aggs: {
      states: {
        terms: { field: 'shard.state', size: aggSize },
        aggs: { primary: { terms: { field: 'shard.primary', size: 2 } } }, // size = 2 since this is a boolean field
      },
    },
  };
  const nodesAgg = {
    terms: {
      field: 'shard.node',
      size: maxBucketSize,
    },
    aggs: {
      index_count: { cardinality: { field: 'shard.index' } },
      node_names: {
        terms: { field: 'source_node.name', size: aggSize },
      },
      node_ids: {
        terms: { field: 'source_node.uuid', size: 1 }, // node can only have 1 id
      },
    },
  };

  return {
    ...{ indices: includeIndices ? indicesAgg : undefined },
    ...{ nodes: includeNodes ? nodesAgg : undefined },
  };
}
