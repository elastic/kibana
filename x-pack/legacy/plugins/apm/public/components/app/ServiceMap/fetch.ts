/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import cytoscape from 'cytoscape';

async function fetchServiceNodeData(
  serviceName: string
): Promise<cytoscape.NodeDataDefinition> {
  // TODO: Fetch!
  return { avgCpuUsage: 1, hasFetched: true, isLoading: false };
}

export async function updateServiceNodeData(node: cytoscape.NodeSingular) {
  if (node.data('hasFetched') || node.data('isLoading')) {
    return;
  }

  node.data('isLoading', true);
  const data = await fetchServiceNodeData(node.id());
  node.data(data);
}
