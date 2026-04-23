/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MarkerType,
  useNodesState,
  useEdgesState,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type NodeTypes,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import type { OTelCollectorConfig } from '../../../../../common/types';

import { OTelComponentDetail } from '../component_detail';

import { configToGraph } from './config_to_graph';
import type { OTelGraphNodeData } from './constants';

import { ComponentNode } from './component_node';
import { PipelineGroupNode } from './pipeline_group_node';
import { applyDagreLayout } from './layout';

const nodeTypes: NodeTypes = {
  component: ComponentNode,
  pipelineGroup: PipelineGroupNode,
};

interface GraphViewProps {
  config: OTelCollectorConfig;
  selectedPipelineId: string;
}

const GraphViewInner: React.FunctionComponent<GraphViewProps> = ({
  config,
  selectedPipelineId,
}) => {
  const { euiTheme } = useEuiTheme();
  const [selectedNode, setSelectedNode] = useState<Node<OTelGraphNodeData> | null>(null);
  const selectedNodeIdRef = useRef<string | null>(null);
  selectedNodeIdRef.current = selectedNode?.id ?? null;

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const { fitView } = useReactFlow();

  useEffect(() => {
    const graph = configToGraph(config, selectedPipelineId);
    const layoutNodes = applyDagreLayout(graph.nodes, graph.edges);
    setNodes(layoutNodes);
    setEdges(graph.edges);
    setSelectedNode(null);
  }, [config, selectedPipelineId, setNodes, setEdges]);

  useEffect(() => {
    fitView({ padding: 0.1 });
  }, [selectedPipelineId, fitView]);

  const updateNodeSelection = useCallback(
    (newSelectedId: string | null) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) => ({
          ...node,
          selected: node.id === newSelectedId,
        }))
      );
    },
    [setNodes]
  );

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      if (node.type !== 'component') {
        return;
      }
      const newSelectedId = selectedNodeIdRef.current === node.id ? null : node.id;
      setSelectedNode(newSelectedId ? (node as Node<OTelGraphNodeData>) : null);
      updateNodeSelection(newSelectedId);
    },
    [updateNodeSelection]
  );

  const handleClose = useCallback(() => {
    setSelectedNode(null);
    updateNodeSelection(null);
  }, [updateNodeSelection]);

  const defaultEdgeOptions = useMemo(
    () => ({
      style: { stroke: euiTheme.colors.mediumShade, strokeWidth: 1.5 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 12,
        height: 12,
        color: euiTheme.colors.mediumShade,
      },
    }),
    [euiTheme]
  );

  const graphContainerStyles = css`
    width: 100%;
    height: 500px;
    border: 1px solid ${euiTheme.colors.borderBasePlain};
    border-radius: ${euiTheme.border.radius.medium};
  `;

  const flexContainerStyles = css`
    display: flex;
    gap: ${euiTheme.size.m};
  `;

  return (
    <div css={flexContainerStyles}>
      <div
        css={css`
          flex: 1 1 0%;
          min-width: 0;
        `}
      >
        <div css={graphContainerStyles}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onPaneClick={handleClose}
            fitView
            fitViewOptions={{ padding: 0.1 }}
            nodesDraggable={false}
            nodesConnectable={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
      </div>
      {selectedNode && (
        <OTelComponentDetail
          componentId={selectedNode.data.label}
          componentType={selectedNode.data.componentType}
          config={config}
          onClose={handleClose}
        />
      )}
    </div>
  );
};

export const GraphView: React.FunctionComponent<GraphViewProps> = (props) => {
  return (
    <ReactFlowProvider>
      <GraphViewInner {...props} />
    </ReactFlowProvider>
  );
};
