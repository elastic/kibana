/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Dagre from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';

const NODE_DIMENSIONS = {
  WIDTH: 200,
  HEIGHT: 100,
};

export const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  nodes.forEach((node) => {
    g.setNode(node.id, {
      width: NODE_DIMENSIONS.WIDTH,
      height: NODE_DIMENSIONS.HEIGHT,
    });
  });

  Dagre.layout(g);

  return {
    layoutedEdges: edges,
    layoutedNodes: nodes.map((node) => {
      const position = g.node(node.id);
      return {
        ...node,
        position: {
          x: position.x - NODE_DIMENSIONS.WIDTH / 2,
          y: position.y - NODE_DIMENSIONS.HEIGHT / 2,
        },
      };
    }),
  };
};
