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
import { EuiFlexGroup, EuiFlexItem, EuiPanel, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import type { OTelCollectorConfig, ComponentHealth } from '../../../../../common/types';

import { OTelComponentDetail } from '../component_detail';

import { configToGraph } from './config_to_graph';
import type { OTelPipelineGroupNodeData } from './config_to_graph';
import type { OTelGraphNodeData } from './constants';

import { ComponentNode } from './component_node';
import { PipelineGroupNode } from './pipeline_group_node';
import { applyDagreLayout } from './layout';
import { enrichNodesWithHealth } from './enrich_nodes_with_health';

type DetailSelection =
  | { type: 'component'; node: Node<OTelGraphNodeData> }
  | { type: 'pipeline'; pipelineId: string };

const nodeTypes: NodeTypes = {
  component: ComponentNode,
  pipelineGroup: PipelineGroupNode,
};

interface GraphViewProps {
  config: OTelCollectorConfig;
  selectedPipelineId: string;
  health?: ComponentHealth;
}

const GraphViewInner: React.FunctionComponent<GraphViewProps> = ({
  config,
  selectedPipelineId,
  health,
}) => {
  const { euiTheme } = useEuiTheme();

  const [selection, setSelection] = useState<DetailSelection | null>(null);
  const selectionRef = useRef<DetailSelection | null>(null);
  selectionRef.current = selection;

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const { fitView } = useReactFlow();

  useEffect(() => {
    const graph = configToGraph(config, selectedPipelineId);
    const layoutNodes = applyDagreLayout(graph.nodes, graph.edges);
    setNodes(layoutNodes);
    setEdges(graph.edges);
    setSelection(null);
  }, [config, selectedPipelineId, setNodes, setEdges]);

  useEffect(() => {
    setNodes((currentNodes) => {
      const updated = currentNodes.map((n) => ({ ...n, data: { ...n.data } }));
      enrichNodesWithHealth(updated, health);

      return updated;
    });
  }, [selectedPipelineId, health, setNodes, config]);

  useEffect(() => {
    fitView({ padding: 0.1 });
  }, [selectedPipelineId, fitView]);

  const updateNodesVisualState = useCallback(
    (selectedComponentId: string | null, selectedPipelineLabel: string | null) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.type === 'pipelineGroup'
            ? {
                ...node,
                data: { ...node.data, isSelected: node.data.label === selectedPipelineLabel },
              }
            : { ...node, selected: node.id === selectedComponentId }
        )
      );
    },
    [setNodes]
  );

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      if (node.type === 'component') {
        const current = selectionRef.current;
        const isAlreadySelected = current?.type === 'component' && current.node.id === node.id;
        const newSelection = isAlreadySelected
          ? null
          : { type: 'component' as const, node: node as Node<OTelGraphNodeData> };
        setSelection(newSelection);
        updateNodesVisualState(newSelection?.node.id ?? null, null);
      } else if (node.type === 'pipelineGroup') {
        const pipelineId = (node as Node<OTelPipelineGroupNodeData>).data.label;
        const current = selectionRef.current;
        const isAlreadySelected = current?.type === 'pipeline' && current.pipelineId === pipelineId;
        const newPipelineId = isAlreadySelected ? null : pipelineId;
        setSelection(newPipelineId ? { type: 'pipeline', pipelineId: newPipelineId } : null);
        updateNodesVisualState(null, newPipelineId);
      }
    },
    [updateNodesVisualState]
  );

  const handleClose = useCallback(() => {
    setSelection(null);
    updateNodesVisualState(null, null);
  }, [updateNodesVisualState]);

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

  return (
    <EuiFlexGroup gutterSize="m" responsive={false}>
      <EuiFlexItem
        css={css`
          min-width: 0;
        `}
        grow={4}
      >
        <EuiPanel
          hasBorder
          paddingSize="none"
          css={css`
            width: 100%;
            height: 500px;
          `}
        >
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
        </EuiPanel>
      </EuiFlexItem>
      {selection && (
        <EuiFlexItem grow={2}>
          <OTelComponentDetail
            componentId={
              selection.type === 'component' ? selection.node.data.label : selection.pipelineId
            }
            componentType={
              selection.type === 'component' ? selection.node.data.componentType : 'pipeline'
            }
            config={config}
            health={health}
            onClose={handleClose}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

export const GraphView: React.FunctionComponent<GraphViewProps> = (props) => {
  return (
    <ReactFlowProvider>
      <GraphViewInner {...props} />
    </ReactFlowProvider>
  );
};
