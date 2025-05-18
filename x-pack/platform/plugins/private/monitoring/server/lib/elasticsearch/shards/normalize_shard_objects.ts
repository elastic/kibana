/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition } from 'lodash';
import { calculateNodeType, Node } from '../nodes';

/*
 * Reducer function for a set of nodes to key the array by nodeId, summarize
 * the shard data, and use calculateNodeType to determine if the node type is master
 * @param masterNode = nodeId of master node
 * @return reducer function for set of nodes
 */

type NodeShard = Node & {
  key: string;
  node_ids: { buckets: Array<{ key: string }> };
  node_names: { buckets: Array<{ key: string }> };
  index_count: { value: number };
  doc_count: number;
};

interface ShardBucket {
  key: string;
  primary: {
    buckets: Array<{
      key: string;
      key_as_string: string;
      doc_count: number;
    }>;
  };
}

export function normalizeNodeShards(masterNode: string) {
  return (nodes: NodeShard[], node: NodeShard) => {
    if (node.key && node.node_ids) {
      const nodeIds = node.node_ids.buckets.map((b) => b.key);
      const _node = {
        ...node,
        node_ids: nodeIds,
      };

      return {
        ...nodes,
        [node.key]: {
          shardCount: node.doc_count,
          indexCount: node.index_count.value,
          // this field is always missing, problem with package?  elasticsearch.node.name ECS field doesn't exist
          name: node.node_names.buckets[0]?.key || 'NO NAME',
          node_ids: nodeIds,
          type: calculateNodeType(_node, masterNode), // put the "star" icon on the node link in the shard allocator
        },
      };
    }
    return nodes;
  };
}

const countShards = (shardBuckets: ShardBucket[]) => {
  let primaryShards = 0;
  let replicaShards = 0;

  shardBuckets.forEach((shard) => {
    const primaryMap = shard.primary.buckets ?? [];

    const primaryBucket = primaryMap.find((b) => b.key_as_string === 'true');
    if (primaryBucket !== undefined) {
      primaryShards += primaryBucket.doc_count;
    }

    const replicaBucket = primaryMap.find((b) => b.key_as_string === 'false');
    if (replicaBucket !== undefined) {
      replicaShards += replicaBucket.doc_count;
    }
  });

  return {
    primaryShards,
    replicaShards,
  };
};

interface Index {
  key: string;
  states?: { buckets?: ShardBucket[] };
}

/*
 * Reducer function for a set of indices to key the array by index name, and
 * summarize the shard data.
 * @return reducer function for set of indices
 */
export function normalizeIndexShards(indices: Index[], index: Index) {
  const stateBuckets = index.states?.buckets ?? [];
  const [assignedShardBuckets, unassignedShardBuckets] = partition(stateBuckets, (b) => {
    return b.key === 'STARTED' || b.key === 'RELOCATING';
  });

  const { primaryShards: primary, replicaShards: replica } = countShards(assignedShardBuckets);

  const { primaryShards: unassignedPrimary, replicaShards: unassignedReplica } =
    countShards(unassignedShardBuckets);

  let status = 'green';
  if (unassignedReplica > 0) {
    status = 'yellow';
  }
  if (unassignedPrimary > 0) {
    status = 'red';
  }

  return {
    ...indices,
    [index.key]: {
      status,
      primary,
      replica,
      unassigned: {
        primary: unassignedPrimary,
        replica: unassignedReplica,
      },
    },
  };
}
