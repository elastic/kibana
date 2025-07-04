/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * LEGACY: we need to handle legacy data with some workaround values
 * If node information can't be retrieved, we call this function
 * that provides some usable defaults
 */
export function getDefaultNodeFromId(nodeId: string) {
  return {
    id: nodeId,
    name: nodeId,
    transport_address: '',
    master: false,
    type: 'node',
    attributes: {},
  };
}

export function isDefaultNode(node: any): node is ReturnType<typeof getDefaultNodeFromId> {
  return !node.uuid;
}
