/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useRef, useState, useCallback } from 'react';
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
  const layoutCalled = useRef(false);
  const [isGraphLocked, setIsGraphLocked] = useState(interactive);
  const { initialNodes, initialEdges } = useMemo(
    () => processGraph(nodes, edges, isGraphLocked),
    [nodes, edges, isGraphLocked]
  );

  const [nodesState, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edgesState, _setEdges, onEdgesChange] = useEdgesState(initialEdges);

  if (!layoutCalled.current) {
    const { nodes: layoutedNodes } = layoutGraph(nodesState, edgesState);
    setNodes(layoutedNodes);
    layoutCalled.current = true;
  }

  const onInteractiveStateChange = useCallback(
    (interactiveStatus: boolean): void => {
      setIsGraphLocked(interactiveStatus);
      setNodes((prevNodes) =>
        prevNodes.map((node) => ({
          ...node,
          data: {
            ...node.data,
            interactive: interactiveStatus,
          },
        }))
      );
    },
    [setNodes]
  );

  return (
    <div {...rest}>
      <SvgDefsMarker />
      <ReactFlow
        fitView={true}
        onInit={(xyflow) => {
          window.requestAnimationFrame(() => xyflow.fitView());

          // When the graph is not initialized as interactive, we need to fit the view on resize
          if (!interactive) {
            const resizeObserver = new ResizeObserver(() => {
              xyflow.fitView();
            });
            resizeObserver.observe(document.querySelector('.react-flow') as Element);
            return () => resizeObserver.disconnect();
          }
        }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodes={nodesState}
        edges={edgesState}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        proOptions={{ hideAttribution: true }}
        panOnDrag={isGraphLocked}
        zoomOnScroll={isGraphLocked}
        zoomOnPinch={isGraphLocked}
        zoomOnDoubleClick={isGraphLocked}
        preventScrolling={isGraphLocked}
        nodesDraggable={interactive && isGraphLocked}
        maxZoom={1.3}
      >
        {interactive && <Controls onInteractiveChange={onInteractiveStateChange} />}
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
      position: { x: 0, y: 0 }, // Default position, should be updated later
    };

    if (node.type === 'group' && nodeData.shape === 'group') {
      node.sourcePosition = Position.Right;
      node.targetPosition = Position.Left;
      node.resizing = false;
      node.focusable = false;
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
      selectable: false,
      data: {
        ...edgeData,
        sourceShape: nodesById[edgeData.source].shape,
        targetShape: nodesById[edgeData.target].shape,
      },
    };
  });

  return { initialNodes, initialEdges };
};
