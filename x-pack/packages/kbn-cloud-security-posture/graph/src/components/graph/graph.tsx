/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  Background,
  Controls,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import type { Edge, Node } from '@xyflow/react';
import type {
  NodeDataModel,
  EdgeDataModel,
} from '@kbn/cloud-security-posture-common/types/graph/latest';
import type { CommonProps } from '@elastic/eui';
import { SvgDefsMarker } from '../edge/styles';
import {
  HexagonNode,
  PentagonNode,
  EllipseNode,
  RectangleNode,
  DiamondNode,
  LabelNode,
  EdgeGroupNode,
} from '../node';
import { layoutGraph } from './layout_graph';
import { DefaultEdge } from '../edge';
import type { EdgeViewModel, NodeViewModel } from '../types';

import '@xyflow/react/dist/style.css';

interface GraphProps extends CommonProps {
  nodes: NodeDataModel[];
  edges: EdgeDataModel[];
  interactive: boolean;
}

const nodeTypes = {
  hexagon: HexagonNode,
  pentagon: PentagonNode,
  ellipse: EllipseNode,
  rectangle: RectangleNode,
  diamond: DiamondNode,
  label: LabelNode,
  group: EdgeGroupNode,
};

const edgeTypes = {
  default: DefaultEdge,
};

export const Graph: React.FC<GraphProps> = ({ nodes, edges, interactive, ...rest }) => {
  const { initialNodes, initialEdges } = useMemo(
    () => processGraph(nodes, edges, interactive),
    [nodes, edges, interactive]
  );

  const [nodesState, _setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edgesState, _setEdges, onEdgesChange] = useEdgesState(initialEdges);

  layoutGraph(nodesState, edgesState);

  return (
    <div {...rest}>
      <SvgDefsMarker />
      <ReactFlow
        fitView={true}
        onInit={(xyflow) => {
          window.requestAnimationFrame(() => xyflow.fitView());
        }}
        attributionPosition={undefined}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodes={nodesState}
        edges={edgesState}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        proOptions={{ hideAttribution: true }}
      >
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
};

const processGraph = (
  nodesModel: NodeDataModel[],
  edgesModel: EdgeDataModel[],
  interactive: boolean
): {
  initialNodes: Array<Node<NodeViewModel>>;
  initialEdges: Array<Edge<EdgeViewModel>>;
} => {
  const nodesById: { [key: string]: NodeViewModel } = {};

  const initialNodes = nodesModel.map((nodeData) => {
    nodesById[nodeData.id] = nodeData;

    const node: Node<NodeViewModel> = {
      id: nodeData.id,
      type: nodeData.shape,
      data: { ...nodeData, interactive },
      draggable: true,
      position: { x: 0, y: 0 }, // Default position, should be updated later
    };

    if (node.type === 'group' && nodeData.shape === 'group') {
      node.sourcePosition = Position.Right;
      node.targetPosition = Position.Left;
      node.resizing = false;
    } else if (nodeData.shape === 'label' && nodeData.parentId) {
      node.parentId = nodeData.parentId;
      node.extent = 'parent';
      node.expandParent = false;
      node.draggable = false;
    }

    return node;
  });

  const initialEdges: Array<Edge<EdgeViewModel>> = edgesModel.map((edgeData) => {
    const isIn =
      nodesById[edgeData.source].shape !== 'label' && nodesById[edgeData.target].shape === 'group';
    const isInside =
      nodesById[edgeData.source].shape === 'group' && nodesById[edgeData.target].shape === 'label';
    const isOut =
      nodesById[edgeData.source].shape === 'label' && nodesById[edgeData.target].shape === 'group';
    const isOutside =
      nodesById[edgeData.source].shape === 'group' && nodesById[edgeData.target].shape !== 'label';

    return {
      id: edgeData.id,
      type: 'default',
      source: edgeData.source,
      sourceHandle: isInside ? 'inside' : isOutside ? 'outside' : undefined,
      target: edgeData.target,
      targetHandle: isIn ? 'in' : isOut ? 'out' : undefined,
      data: { ...edgeData },
    };
  });

  return { initialNodes, initialEdges };
};
