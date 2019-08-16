/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { mapNodesInfo } from './map_nodes_info';
import { mapNodesMetrics } from './map_nodes_metrics';
import { LISTING_METRICS_NAMES } from './nodes_listing_metrics';
import { CONVERTED_TOKEN } from '../../convert_metric_names';

/*
 * Process the response from the get_nodes query
 * @param {Object} response: response data from get_nodes
 * @param {Object} clusterStats: cluster stats from cluster state document
 * @param {Object} shardStats: per-node information about shards
 * @param {Object} timeOptions: min, max, and bucketSize needed for date histogram creation
 * @return {Array} node info combined with metrics for each node
 */
export function handleResponse(response, clusterStats, shardStats, timeOptions = {}) {
  if (!get(response, 'hits.hits')) {
    return [];
  }

  const nodeHits = get(response, 'hits.hits', []);
  const nodesInfo = mapNodesInfo(nodeHits, clusterStats, shardStats);

  /*
   * Every node bucket is an object with a field for nodeId and fields for
   * metric buckets. This builds an object that has every nodeId as a property,
   * with a sub-object for all the metrics buckets
   */
  const nodeBuckets = get(response, 'aggregations.nodes.buckets', []);
  const metricsForNodes = nodeBuckets.reduce((accum, { key: nodeId, by_date: byDate }) => {
    const grouping = {};
    for (const metricName of LISTING_METRICS_NAMES) {
      grouping[metricName] = {
        buckets: byDate.buckets.map(bucket => {
          const { key_as_string, key, doc_count, ...rest } = bucket; /* eslint-disable-line camelcase */
          const metrics = Object.entries(rest).reduce((accum, [key, value]) => {
            if (key.startsWith(`${CONVERTED_TOKEN}${metricName}`)) {
              const name = key.split('__')[1];
              accum[name] = value;
            }
            return accum;
          }, {});

          return {
            key_as_string, /* eslint-disable-line camelcase */
            key,
            doc_count, /* eslint-disable-line camelcase */
            ...metrics,
          };
        })
      };
    }

    return {
      ...accum,
      [nodeId]: grouping,
    };
  }, {});
  const nodesMetrics = mapNodesMetrics(metricsForNodes, nodesInfo, timeOptions); // summarize the metrics of online nodes

  const nodes = [];
  // nodesInfo is the source of truth for the nodeIds, where nodesMetrics will lack metrics for offline nodes
  Object.keys(nodesInfo).forEach(nodeId => {
    nodes.push({
      ...nodesInfo[nodeId],
      ...nodesMetrics[nodeId],
      resolver: nodeId,
    });
  });

  return nodes;
}
