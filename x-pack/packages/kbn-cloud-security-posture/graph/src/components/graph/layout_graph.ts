/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Dagre from '@dagrejs/dagre';
import type {
  EdgeDataModel,
  NodeDataModel,
} from '@kbn/cloud-security-posture-common/types/graph/latest';
import type { NodeViewModel, Size } from '../types';
import { calcLabelSize } from './utils';

export const layoutGraph = (
  nodes: NodeDataModel[],
  edges: EdgeDataModel[]
): { nodes: NodeViewModel[] } => {
  const nodesById: { [key: string]: NodeViewModel } = {};
  const graphOpts = {
    compound: true,
  };

  const g = new Dagre.graphlib.Graph(graphOpts)
    .setGraph({ rankdir: 'LR', align: 'UL' })
    .setDefaultEdgeLabel(() => ({}));

  edges.forEach((edge) => g.setEdge(edge.source, edge.target));

  nodes.forEach((node) => {
    let size = { width: 90, height: 90 };
    const position = { x: 0, y: 0 };

    if (node.shape === 'label') {
      size = calcLabelSize(node.label);

      // TODO: waiting for a fix: https://github.com/dagrejs/dagre/issues/238
      // if (node.parentId) {
      //   g.setParent(node.id, node.parentId);
      // }
    } else if (node.shape === 'group') {
      const res = layoutGroupChildren(node, nodes);

      size = res.size;

      res.children.forEach((child) => {
        nodesById[child.id] = { ...child };
      });
    }

    if (!nodesById[node.id]) {
      nodesById[node.id] = { ...node, position };
    }

    g.setNode(node.id, {
      ...node,
      ...size,
    });
  });

  Dagre.layout(g);

  const nodesViewModel: NodeViewModel[] = nodes.map((nodeData) => {
    const dagreNode = g.node(nodeData.id);

    // We are shifting the dagre node position (anchor=center center) to the top left
    // so it matches the React Flow node anchor point (top left).
    const x = dagreNode.x - (dagreNode.width ?? 0) / 2;
    const y = dagreNode.y - (dagreNode.height ?? 0) / 2;

    // For grouped nodes, we want to keep the original position relative to the parent
    if (nodeData.shape === 'label' && nodeData.parentId) {
      return {
        ...nodeData,
        position: nodesById[nodeData.id].position,
      };
    } else if (nodeData.shape === 'group') {
      return {
        ...nodeData,
        position: { x, y },
        size: {
          width: dagreNode.width,
          height: dagreNode.height,
        },
      };
    }

    return {
      ...nodeData,
      position: { x, y },
    };
  });

  return { nodes: nodesViewModel };
};

const layoutGroupChildren = (
  groupNode: NodeDataModel,
  nodes: NodeDataModel[]
): { size: Size; children: NodeViewModel[] } => {
  const children = nodes.filter(
    (child) => child.shape === 'label' && child.parentId === groupNode.id
  );

  const STACK_VERTICAL_PADDING = 20;
  const MIN_STACK_HEIGHT = 70;
  const PADDING = 20;
  const stackSize = children.length;
  const allChildrenHeight = children.reduce(
    (prevHeight, node) => prevHeight + calcLabelSize(node.label).height,
    0
  );
  const stackHeight = Math.max(
    allChildrenHeight + (stackSize - 1) * STACK_VERTICAL_PADDING,
    MIN_STACK_HEIGHT
  );

  const space = (stackHeight - allChildrenHeight) / (stackSize - 1);
  const groupNodeWidth = children.reduce((acc, child) => {
    const currLblWidth = PADDING * 2 + calcLabelSize(child.label).width;
    return Math.max(acc, currLblWidth);
  }, 0);

  // Layout children relative to parent
  const positionedChildren: NodeViewModel[] = children.map((child, index) => {
    const childSize = calcLabelSize(child.label);
    const childPosition = {
      x: groupNodeWidth / 2 - childSize.width / 2,
      y: index * (childSize.height * 2 + space),
    };

    return { ...child, position: childPosition };
  });

  return {
    size: { width: groupNodeWidth, height: stackHeight },
    children: positionedChildren,
  };
};
