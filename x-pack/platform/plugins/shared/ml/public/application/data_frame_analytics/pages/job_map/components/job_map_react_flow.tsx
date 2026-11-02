/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useEuiTheme } from '@elastic/eui';
import type { MapElements } from '@kbn/ml-data-frame-analytics-utils';
import { JOB_MAP_NODE_TYPES } from '@kbn/ml-data-frame-analytics-utils';
import {
  Background,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  useUpdateNodeInternals,
  type NodeMouseHandler,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useNotifications } from '../../../../contexts/kibana';
import {
  JOB_MAP_FLOW_NODE_TYPE,
  mapElementsToFlowGraph,
  type JobMapNodeData,
} from '../map_elements_to_flow';
import { JobMapFlowNode } from './job_map_flow_node';

const nodeTypes: NodeTypes = {
  [JOB_MAP_FLOW_NODE_TYPE]: JobMapFlowNode,
};

const reactFlowProOptions = { hideAttribution: true } as const;
const reactFlowStyle = { width: '100%', height: '100%' } as const;

interface JobMapReactFlowInnerProps {
  elements: MapElements[];
  width: number;
  height: number;
  resetViewportSignal: number;
  selectedNodeId: string | undefined;
  onSelectNodeData: (data: JobMapNodeData) => void;
  onClearSelection: () => void;
}

const JobMapReactFlowInner: FC<JobMapReactFlowInnerProps> = ({
  elements,
  width,
  height,
  resetViewportSignal,
  selectedNodeId,
  onSelectNodeData,
  onClearSelection,
}) => {
  const { euiTheme } = useEuiTheme();
  const { toasts } = useNotifications();
  const { fitView } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();

  const edgeColor = euiTheme.colors.lightShade;

  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(
    () => mapElementsToFlowGraph(elements, edgeColor),
    [elements, edgeColor]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  useEffect(() => {
    setNodes(
      layoutNodes.map((n) => ({
        ...n,
        selected: n.id === selectedNodeId,
      }))
    );
    setEdges(layoutEdges);
  }, [layoutNodes, layoutEdges, selectedNodeId, setEdges, setNodes]);

  useEffect(() => {
    if (width <= 0 || height <= 0) {
      return;
    }
    let innerFrameId: number | undefined;
    const outerFrameId = window.requestAnimationFrame(() => {
      // Recalculate handle bounds after layout/DOM updates so edges use correct
      // endpoints (avoids gaps when measured size differs from dagre assumptions).
      layoutNodes.forEach((node) => {
        updateNodeInternals(node.id);
      });
      innerFrameId = window.requestAnimationFrame(() => {
        fitView({ padding: 0.15, duration: 200 });
      });
    });
    return () => {
      window.cancelAnimationFrame(outerFrameId);
      if (innerFrameId !== undefined) {
        window.cancelAnimationFrame(innerFrameId);
      }
    };
  }, [fitView, height, layoutNodes, resetViewportSignal, updateNodeInternals, width]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const d = node.data as JobMapNodeData;
      if (d.type === JOB_MAP_NODE_TYPES.ANALYTICS_JOB_MISSING) {
        toasts.addWarning(
          i18n.translate('xpack.ml.dataframe.analyticsMap.flyout.jobMissingMessage', {
            defaultMessage: 'There is no data available for job {label}.',
            values: { label: d.label },
          })
        );
        return;
      }
      onSelectNodeData(d);
    },
    [onSelectNodeData, toasts]
  );

  const canvasCss = css`
    background: ${euiTheme.colors.backgroundBasePlain};
    width: ${width}px;
    height: ${height}px;
  `;

  if (width <= 0 || height <= 0) {
    return <div data-test-subj="mlPageDataFrameAnalyticsMapGraph" css={canvasCss} />;
  }

  return (
    <div data-test-subj="mlPageDataFrameAnalyticsMapGraph" css={canvasCss}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onClearSelection}
        style={reactFlowStyle}
        minZoom={0.2}
        maxZoom={3}
        nodesConnectable={false}
        nodesDraggable={false}
        elementsSelectable
        panOnScroll
        zoomOnScroll
        zoomOnPinch
        fitView={false}
        proOptions={reactFlowProOptions}
      >
        <Background gap={16} size={1} color={euiTheme.colors.lightShade} />
      </ReactFlow>
    </div>
  );
};

export interface JobMapReactFlowProps {
  elements: MapElements[];
  width: number;
  height: number;
  resetViewportSignal: number;
  selectedNodeId: string | undefined;
  onSelectNodeData: (data: JobMapNodeData) => void;
  onClearSelection: () => void;
}

export const JobMapReactFlow: FC<JobMapReactFlowProps> = (props) => (
  <ReactFlowProvider>
    <JobMapReactFlowInner {...props} />
  </ReactFlowProvider>
);
