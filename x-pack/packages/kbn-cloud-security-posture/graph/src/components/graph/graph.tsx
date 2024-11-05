/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { size, isEmpty, isEqual, xorWith } from 'lodash';
import {
  Background,
  Controls,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import type { Edge, FitViewOptions, Node } from '@xyflow/react';
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
  /**
   * Array of node view models to be rendered in the graph.
   */
  nodes: NodeViewModel[];
  /**
   * Array of edge view models to be rendered in the graph.
   */
  edges: EdgeViewModel[];
  /**
   * Determines whether the graph is interactive (allows panning, zooming, etc.).
   * When set to false, the graph is locked and user interactions are disabled, effectively putting it in view-only mode.
   */
  interactive: boolean;
  /**
   * Determines whether the graph is locked. Nodes and edges are still interactive, but the graph itself is not.
   */
  isLocked?: boolean;
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
export const Graph: React.FC<GraphProps> = ({
  nodes,
  edges,
  interactive,
  isLocked: isLockedProp = false,
  ...rest
}) => {
  const backgroundId = Math.random().toFixed(4); // TODO: use useId(); when available (react >=18)
  const fitViewRef = useRef<
    ((fitViewOptions?: FitViewOptions<Node> | undefined) => Promise<boolean>) | null
  >(null);
  const [prevNodes, setPrevNodes] = useState<NodeViewModel[]>([]);
  const [prevEdges, setPrevEdges] = useState<EdgeViewModel[]>([]);
  const [isGraphLocked, setIsGraphLocked] = useState(!interactive);
  const [nodesState, setNodes, onNodesChange] = useNodesState<Node<NodeViewModel>>([]);
  const [edgesState, setEdges, onEdgesChange] = useEdgesState<Edge<EdgeViewModel>>([]);

  useEffect(() => {
    // On nodes or edges changes reset the graph and re-layout
    if (!isArrayOfObjectsEqual(nodes, prevNodes) || !isArrayOfObjectsEqual(edges, prevEdges)) {
      const { initialNodes, initialEdges } = processGraph(nodes, edges, !isGraphLocked);
      const { nodes: layoutedNodes } = layoutGraph(initialNodes, initialEdges);

      setNodes(layoutedNodes);
      setEdges(initialEdges);
      setPrevNodes(nodes);
      setPrevEdges(edges);
      setTimeout(() => {
        fitViewRef.current?.();
      }, 30);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- We only want to run this effect when nodes or edges change
  }, [nodes, edges, setNodes, setEdges]);

  const onInteractiveStateChange = useCallback(
    (interactiveStatus: boolean): void => {
      setIsGraphLocked(!interactiveStatus);
      setNodes((currNodes) =>
        currNodes.map((node) => ({
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
          fitViewRef.current = xyflow.fitView;

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
        panOnDrag={!isGraphLocked && !isLockedProp}
        zoomOnScroll={!isGraphLocked && !isLockedProp}
        zoomOnPinch={!isGraphLocked && !isLockedProp}
        zoomOnDoubleClick={!isGraphLocked && !isLockedProp}
        preventScrolling={interactive}
        nodesDraggable={interactive && !isGraphLocked && !isLockedProp}
        maxZoom={1.3}
        minZoom={0.1}
      >
        {interactive && <Controls onInteractiveChange={onInteractiveStateChange} />}
        <Background id={backgroundId} />{' '}
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

const isArrayOfObjectsEqual = (x: object[], y: object[]) =>
  size(x) === size(y) && isEmpty(xorWith(x, y, isEqual));
