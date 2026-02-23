/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { parse } from 'yaml';
import {
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  useEuiTheme,
} from '@elastic/eui';
import type { Node, NodeTypes, ColorMode } from '@xyflow/react';
import { ReactFlow, Background, Controls, Position } from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { WorkflowGraph } from '@kbn/workflows/graph';
import type { WorkflowYaml } from '@kbn/workflows';
import type { WorkflowDraftAttachmentData } from '../../server/attachment_types/workflow_draft';

import '@xyflow/react/dist/style.css';

interface WorkflowDraftViewerProps {
  attachment: Attachment<string, WorkflowDraftAttachmentData>;
}

/**
 * Simple workflow node component for visualization.
 */
const WorkflowNode: React.FC<{ data: { label: string; stepType: string } }> = ({ data }) => {
  const { euiTheme } = useEuiTheme();

  const getNodeColor = () => {
    if (data.stepType?.startsWith('enter')) return euiTheme.colors.backgroundLightSuccess;
    if (data.stepType?.startsWith('exit')) return euiTheme.colors.backgroundLightDanger;
    if (data.stepType === 'action') return euiTheme.colors.backgroundLightPrimary;
    return euiTheme.colors.backgroundBaseSubdued;
  };

  return (
    <div
      style={{
        padding: '8px 12px',
        borderRadius: '4px',
        border: `1px solid ${euiTheme.border.color}`,
        backgroundColor: getNodeColor(),
        fontSize: '12px',
        fontWeight: 500,
        minWidth: '80px',
        textAlign: 'center',
      }}
    >
      {data.label}
    </div>
  );
};

const nodeTypes: NodeTypes = {
  default: WorkflowNode,
};

/**
 * Convert WorkflowGraph to ReactFlow nodes and edges using dagre layout.
 */
function convertToReactFlow(graph: WorkflowGraph) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setGraph({ rankdir: 'TB', nodesep: 50, ranksep: 50 });
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Add nodes
  graph.getAllNodes().forEach((node) => {
    dagreGraph.setNode(node.id, { width: 120, height: 40 });
  });

  // Add edges
  graph.getEdges().forEach((edge) => {
    dagreGraph.setEdge(edge.v, edge.w);
  });

  dagre.layout(dagreGraph);

  const nodes: Node[] = graph.getAllNodes().map((graphNode) => {
    const dagreNode = dagreGraph.node(graphNode.id);
    return {
      id: graphNode.id,
      data: { label: graphNode.id, stepType: graphNode.type },
      position: { x: dagreNode.x - 60, y: dagreNode.y - 20 },
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
      type: 'default',
    };
  });

  const edges = graph.getEdges().map((e) => ({
    id: `${e.v}-${e.w}`,
    source: e.v,
    target: e.w,
    label: graph.getEdge(e)?.label,
  }));

  return { nodes, edges };
}

/**
 * React component for rendering workflow draft attachments.
 * Displays a visual preview of the workflow using React Flow.
 */
export const WorkflowDraftViewer: React.FC<WorkflowDraftViewerProps> = ({ attachment }) => {
  const { yaml: yamlString, name, description } = attachment.data;
  const { euiTheme, colorMode } = useEuiTheme();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Parse the YAML and build the workflow graph
  const layoutResult = useMemo<{ nodes: Node[]; edges: ReturnType<typeof convertToReactFlow>['edges'] } | null>(() => {
    try {
      const parsedYaml = parse(yamlString) as WorkflowYaml;
      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(parsedYaml);
      return convertToReactFlow(workflowGraph);
    } catch {
      return null;
    }
  }, [yamlString]);

  const onInit = useCallback((reactFlowInstance: { fitView: (options: { padding: number }) => void }) => {
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2 });
    }, 100);
  }, []);

  if (!layoutResult) {
    return (
      <EuiCallOut
        title="Invalid workflow YAML"
        color="danger"
        iconType="error"
        data-test-subj="workflowDraftViewer-error"
      >
        <p>The workflow YAML could not be parsed.</p>
      </EuiCallOut>
    );
  }

  return (
    <EuiPanel paddingSize="m" hasBorder data-test-subj="workflowDraftViewer">
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow" iconType="pipelineApp">
            Draft
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h3>{name ?? 'Untitled Workflow'}</h3>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>

      {description && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>{description}</p>
          </EuiText>
        </>
      )}

      <EuiSpacer size="m" />

      <div
        style={{
          height: 400,
          border: `1px solid ${euiTheme.border.color}`,
          borderRadius: euiTheme.border.radius.medium,
          overflow: 'hidden',
        }}
      >
        <ReactFlow
          nodes={layoutResult.nodes}
          edges={layoutResult.edges}
          nodeTypes={nodeTypes}
          onInit={onInit}
          fitView={isReady}
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
          colorMode={colorMode.toLowerCase() as ColorMode}
        >
          <Background bgColor={euiTheme.colors.backgroundBasePlain} color={euiTheme.colors.textSubdued} />
          <Controls />
        </ReactFlow>
      </div>
    </EuiPanel>
  );
};
