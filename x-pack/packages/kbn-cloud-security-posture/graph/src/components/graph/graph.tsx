/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  Background,
  Controls,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import type { Edge, Node } from '@xyflow/react';
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

export interface GraphProps extends CommonProps {
  nodes: NodeViewModel[];
  edges: EdgeViewModel[];
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

/**
 * Graph component renders a graph visualization using ReactFlow.
 * It takes nodes and edges as input and provides interactive controls
 * for panning, zooming, and manipulating the graph.
 *
 * @component
 * @param {GraphProps} props - The properties for the Graph component.
 * @param {NodeViewModel[]} props.nodes - Array of node view models to be rendered in the graph.
 * @param {EdgeViewModel[]} props.edges - Array of edge view models to be rendered in the graph.
 * @param {boolean} props.interactive - Flag to enable or disable interactivity (panning, zooming, etc.).
 * @param {CommonProps} [props.rest] - Additional common properties.
 *
 * @returns {JSX.Element} The rendered Graph component.
 */
export const Graph: React.FC<GraphProps> = ({ nodes, edges, interactive, ...rest }) => {
  const [layoutCalled, setLayoutCalled] = useState(false);
  const { initialNodes, initialEdges } = useMemo(
    () => processGraph(nodes, edges, interactive),
    [nodes, edges, interactive]
  );

  const [nodesState, _setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edgesState, _setEdges, onEdgesChange] = useEdgesState(initialEdges);

  if (!layoutCalled) {
    layoutGraph(nodesState, edgesState);
    setLayoutCalled(true);
  }

  return (
    <div {...rest}>
      <SvgDefsMarker />
      <ReactFlow
        fitView={true}
        onInit={(xyflow) => {
          window.requestAnimationFrame(() => xyflow.fitView());
        }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodes={nodesState}
        edges={edgesState}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        proOptions={{ hideAttribution: true }}
        panOnDrag={interactive}
        zoomOnScroll={interactive}
        zoomOnPinch={interactive}
        zoomOnDoubleClick={interactive}
        preventScrolling={interactive}
      >
        {interactive && <Controls />}
        <Background />
      </ReactFlow>
    </div>
  );
};

const processGraph = (
  nodesModel: NodeViewModel[],
  edgesModel: EdgeViewModel[],
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
      draggable: interactive,
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
      focusable: false,
      data: {
        ...edgeData,
        sourceShape: nodesById[edgeData.source].shape,
        targetShape: nodesById[edgeData.target].shape,
      },
    };
  });

  return { initialNodes, initialEdges };
};
