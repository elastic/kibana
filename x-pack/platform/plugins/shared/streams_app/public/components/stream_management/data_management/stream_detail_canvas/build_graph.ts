/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { buildSourceNode } from './build_source';
import { buildDestinationNode } from './build_destination';
import { layoutGraph } from './layout';
import { ANIMATED_EDGE_TYPE, type ClassicCanvasGraph, type ClassicCanvasNode } from './types';

/**
 * Orchestrates the whole classic-streams graph: it delegates node construction to
 * the per-area builders (`build_source`, `build_destination`), wires the edges,
 * and runs the shared auto-layout. Each new node kind (pipeline, routing, ...)
 * gets its own `build_*` module and is composed in here.
 */
export const buildClassicStreamsGraph = (
  streams: Streams.ClassicStream.Definition[]
): ClassicCanvasGraph => {
  const nodes: ClassicCanvasNode[] = [];
  const edges: ClassicCanvasGraph['edges'] = [];

  streams.forEach((definition) => {
    const source = buildSourceNode(definition);
    const destination = buildDestinationNode(definition);

    nodes.push(source, destination);
    edges.push({
      id: `${source.id}->${destination.id}`,
      source: source.id,
      target: destination.id,
      type: ANIMATED_EDGE_TYPE,
    });
  });

  // Positions come from the shared auto-layout so the placement logic stays in
  // one place and extends to richer topologies (pipelines, routing) later.
  const positions = layoutGraph(nodes, edges);
  const positionedNodes = nodes.map((node) => ({
    ...node,
    position: positions.get(node.id) ?? node.position,
  })) as ClassicCanvasNode[];

  return { nodes: positionedNodes, edges };
};
