/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Assigns (x, y) positions to React Flow nodes using the Dagre layered-graph
 * algorithm. React Flow requires explicit positions; without them every node
 * renders at (0, 0). Dagre places nodes in ranked columns (left-to-right by
 * default) so the job-map reads as a data-lineage pipeline. A square-grid
 * fallback is used if Dagre throws (e.g. the graph contains a cycle).
 */

import Dagre from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';
import {
  JOB_MAP_GRAPH_MARGIN,
  JOB_MAP_NODE_HEIGHT,
  JOB_MAP_NODE_SEPARATION,
  JOB_MAP_NODE_WIDTH,
  JOB_MAP_RANK_SEPARATION,
} from './job_map_flow_constants';

export interface JobMapLayoutOptions {
  rankdir?: 'TB' | 'LR';
  ranksep?: number;
  nodesep?: number;
  marginx?: number;
  marginy?: number;
  nodeWidth?: number;
  nodeHeight?: number;
}

const defaultOptions: Required<JobMapLayoutOptions> = {
  rankdir: 'LR',
  ranksep: JOB_MAP_RANK_SEPARATION,
  nodesep: JOB_MAP_NODE_SEPARATION,
  marginx: JOB_MAP_GRAPH_MARGIN,
  marginy: JOB_MAP_GRAPH_MARGIN,
  nodeWidth: JOB_MAP_NODE_WIDTH,
  nodeHeight: JOB_MAP_NODE_HEIGHT,
};

function applyGridFallbackLayout<T extends Record<string, unknown>>(
  nodes: Node<T>[],
  opts: Required<JobMapLayoutOptions>
): Node<T>[] {
  const cols = Math.ceil(Math.sqrt(nodes.length));
  return nodes.map((node, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      ...node,
      position: {
        x: Math.round(opts.marginx + col * (opts.nodeWidth + opts.nodesep)),
        y: Math.round(opts.marginy + row * (opts.nodeHeight + opts.ranksep)),
      },
    };
  });
}

export function applyJobMapDagreLayout<T extends Record<string, unknown>>(
  nodes: Node<T>[],
  edges: Edge[],
  options: JobMapLayoutOptions = {}
): Node<T>[] {
  if (nodes.length === 0) {
    return nodes;
  }

  const opts = { ...defaultOptions, ...options };

  const g = new Dagre.graphlib.Graph({ directed: true, compound: false })
    .setGraph({
      rankdir: opts.rankdir,
      ranksep: opts.ranksep,
      nodesep: opts.nodesep,
      marginx: opts.marginx,
      marginy: opts.marginy,
    })
    .setDefaultEdgeLabel(() => ({}));

  nodes.forEach((node) => {
    g.setNode(node.id, {
      width: opts.nodeWidth,
      height: opts.nodeHeight,
    });
  });

  edges.forEach((edge) => {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  });

  try {
    Dagre.layout(g);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[JobMap] Dagre layout failed, falling back to grid layout:', err);
    return applyGridFallbackLayout(nodes, opts);
  }

  return nodes.map((node) => {
    const dagreNode = g.node(node.id);
    if (!dagreNode) {
      return node;
    }
    return {
      ...node,
      position: {
        x: Math.round(dagreNode.x - opts.nodeWidth / 2),
        y: Math.round(dagreNode.y - opts.nodeHeight / 2),
      },
    };
  });
}
