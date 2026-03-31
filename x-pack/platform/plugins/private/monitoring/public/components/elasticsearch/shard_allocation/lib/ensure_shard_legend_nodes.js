/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Ensures the API response has a valid nodes map for the Shard Legend so the UI
 * can render node names (or at least node IDs) even when the nodes aggregation
 * is empty or lags (e.g. monitoring data not yet indexed for this index).
 * Prevents "Shard Legend not populated" when shards are present but nodes are
 * missing or empty (see https://github.com/elastic/sdh-kibana/issues/6121).
 *
 * @param {{ shards?: unknown[], nodes?: Record<string, unknown> | unknown[] }} response - Index or node detail API response
 * @returns {Record<string, { name: string, type: string, node_ids: string[] }>} Normalized nodes object keyed by node id
 */
export function ensureShardLegendNodes(response) {
  const shards = response?.shards ?? [];
  let nodes = response?.nodes;

  // API can return nodes as [] when aggregation has no buckets; coerce to object
  if (Array.isArray(nodes) || nodes == null) {
    nodes = {};
  }
  if (typeof nodes !== 'object') {
    nodes = {};
  }

  const result = { ...nodes };

  for (const shard of shards) {
    const nodeId = shard?.node;
    if (nodeId && result[nodeId] == null) {
      result[nodeId] = {
        name: nodeId,
        type: 'node',
        node_ids: [nodeId],
      };
    }
  }

  return result;
}
