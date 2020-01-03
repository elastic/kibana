/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, isUndefined } from 'lodash';
import { calculateNodeType, getNodeTypeClassLabel } from '../';
import { metrics } from '../../../metrics/elasticsearch/metrics';

const METRICS = [
  'node_cpu_utilization',
  'node_load_average',
  'node_jvm_mem_percent',
  'node_free_space',
];

export function mapNodesInfo(nodeHits, clusterStats, shardStats) {
  const clusterState = get(clusterStats, 'cluster_state', { nodes: {} });

  return nodeHits.map(node => {
    const latest = get(node, 'latest.hits.hits[0]._source');
    const earliest = get(node, 'earliest.hits.hits[0]._source');
    const sourceNode = get(latest, 'source_node');

    const calculatedNodeType = calculateNodeType(sourceNode, get(clusterState, 'master_node'));
    const { nodeType, nodeTypeLabel, nodeTypeClass } = getNodeTypeClassLabel(
      sourceNode,
      calculatedNodeType
    );
    const isOnline = !isUndefined(get(clusterState, ['nodes', sourceNode.uuid]));

    return {
      name: sourceNode.name,
      transport_address: sourceNode.transport_address,
      type: nodeType,
      isOnline,
      nodeTypeLabel: nodeTypeLabel,
      nodeTypeClass: nodeTypeClass,
      shardCount: get(shardStats, `nodes[${sourceNode.uuid}].shardCount`, 0),
      ...METRICS.reduce((fields, metricName) => {
        const metric = metrics[metricName];
        fields[metricName] = {
          metric,
          summary: {
            minVal: get(node, `${metricName}_min.value`),
            maxVal: get(node, `${metricName}_max.value`),
            lastVal: get(latest, metric.field),
            slope: get(latest, metric.field) - get(earliest, metric.field) > 0 ? 1 : 1,
          },
        };
        return fields;
      }, {}),
    };
  });
}
