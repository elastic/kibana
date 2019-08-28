/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Edge } from './edge';
import { BooleanEdge } from './boolean_edge';

export function edgeFactory(graph, edgeJson) {
  const type = edgeJson.type;
  switch (type) {
    case 'plain':
      return new Edge(graph, edgeJson);
    case 'boolean':
      return new BooleanEdge(graph, edgeJson);
    default:
      throw new Error(`Unknown edge type ${type}! This shouldn't happen!`);
  }
}
