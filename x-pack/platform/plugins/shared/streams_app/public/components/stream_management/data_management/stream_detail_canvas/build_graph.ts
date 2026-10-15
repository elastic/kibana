/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { buildDataStreamsNode } from './build_data_streams';
import { buildDestinationNode } from './build_destination';
import { layoutGraph } from './layout';
import { ANIMATED_EDGE_TYPE, type ClassicCanvasGraph, type ClassicCanvasNode } from './types';

export interface BuildClassicStreamsGraphOptions {
  /** When true, fan the hub out to one destination node per classic stream. */
  expanded?: boolean;
}

/**
 * Classic streams that are not already owned by a unit destination collapse into
 * one Data streams hub. Expanding the hub fans destination cards out from it.
 */
export const buildClassicStreamsGraph = (
  streams: Streams.ClassicStream.Definition[],
  { expanded = false }: BuildClassicStreamsGraphOptions = {}
): ClassicCanvasGraph => {
  if (streams.length === 0) {
    return { nodes: [], edges: [] };
  }

  const hub = buildDataStreamsNode(streams.length, expanded);
  if (!expanded) {
    return { nodes: [hub], edges: [] };
  }

  const destinations = streams.map(buildDestinationNode);
  const nodes: ClassicCanvasNode[] = [hub, ...destinations];
  const edges: ClassicCanvasGraph['edges'] = destinations.map((destination) => ({
    id: `${hub.id}->${destination.id}`,
    source: hub.id,
    target: destination.id,
    type: ANIMATED_EDGE_TYPE,
    reconnectable: false,
  }));

  const positions = layoutGraph(nodes, edges);
  const positionedNodes = nodes.map((node) => ({
    ...node,
    position: positions.get(node.id) ?? node.position,
  })) as ClassicCanvasNode[];

  return { nodes: positionedNodes, edges };
};
