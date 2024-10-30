/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';
import type { EdgeViewModel, NodeViewModel, Size } from '../types';
import { calcLabelSize } from './utils';
import { GroupStyleOverride, NODE_HEIGHT, NODE_WIDTH } from '../node/styles';

export const layoutGraph = (
  nodes: Array<Node<NodeViewModel>>,
  edges: Array<Edge<EdgeViewModel>>
): { nodes: Array<Node<NodeViewModel>> } => {
  const nodesById: { [key: string]: Node<NodeViewModel> } = {};
  const graphOpts = {
    compound: true,
  };

  const g = new Dagre.graphlib.Graph(graphOpts)
    .setGraph({ rankdir: 'LR', align: 'UL' })
    .setDefaultEdgeLabel(() => ({}));

  edges.forEach((edge) => g.setEdge(edge.source, edge.target));

  nodes.forEach((node) => {
    let size = { width: NODE_WIDTH, height: node.measured?.height ?? NODE_HEIGHT };

    if (node.data.shape === 'label') {
      size = calcLabelSize(node.data.label);

      // TODO: waiting for a fix: https://github.com/dagrejs/dagre/issues/238
      // if (node.parentId) {
      //   g.setParent(node.id, node.parentId);
      // }
    } else if (node.data.shape === 'group') {
      const res = layoutGroupChildren(node, nodes);

      size = res.size;

      res.children.forEach((child) => {
        nodesById[child.data.id] = child;
      });
    }

    if (!nodesById[node.id]) {
      nodesById[node.id] = node;
    }

    g.setNode(node.id, {
      ...node,
      ...size,
    });
  });

  Dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const dagreNode = g.node(node.data.id);

    // We are shifting the dagre node position (anchor=center center) to the top left
    // so it matches the React Flow node anchor point (top left).
    const x = dagreNode.x - (dagreNode.width ?? 0) / 2;
    const y = dagreNode.y - (dagreNode.height ?? 0) / 2;

    // For grouped nodes, we want to keep the original position relative to the parent
    if (node.data.shape === 'label' && node.data.parentId) {
      return {
        ...node,
        position: nodesById[node.data.id].position,
      };
    } else if (node.data.shape === 'group') {
      return {
        ...node,
        position: { x, y },
        style: GroupStyleOverride({
          width: dagreNode.width,
          height: dagreNode.height,
        }),
      };
    } else if (node.data.shape === 'label') {
      return {
        ...node,
        position: { x, y },
      };
    } else {
      // Align nodes to labels by shifting the node position by it's label height
      return {
        ...node,
        position: { x, y: y + (dagreNode.height - NODE_HEIGHT) / 2 },
      };
    }
  });

  return { nodes: layoutedNodes };
};

const layoutGroupChildren = (
  groupNode: Node<NodeViewModel>,
  nodes: Array<Node<NodeViewModel>>
): { size: Size; children: Array<Node<NodeViewModel>> } => {
  const children = nodes.filter(
    (child) => child.data.shape === 'label' && child.parentId === groupNode.id
  );

  const STACK_VERTICAL_PADDING = 20;
  const MIN_STACK_HEIGHT = 70;
  const PADDING = 20;
  const stackSize = children.length;
  const allChildrenHeight = children.reduce(
    (prevHeight, node) => prevHeight + calcLabelSize(node.data.label).height,
    0
  );
  const stackHeight = Math.max(
    allChildrenHeight + (stackSize - 1) * STACK_VERTICAL_PADDING,
    MIN_STACK_HEIGHT
  );

  const space = (stackHeight - allChildrenHeight) / (stackSize - 1);
  const groupNodeWidth = children.reduce((acc, child) => {
    const currLblWidth = PADDING * 2 + calcLabelSize(child.data.label).width;
    return Math.max(acc, currLblWidth);
  }, 0);

  // Layout children relative to parent
  children.forEach((child, index) => {
    const childSize = calcLabelSize(child.data.label);
    child.position = {
      x: groupNodeWidth / 2 - childSize.width / 2,
      y: index * (childSize.height * 2 + space),
    };
  });

  return {
    size: { width: groupNodeWidth, height: stackHeight },
    children,
  };
};
