/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COLOR_MODES_STANDARD, transparentize, useEuiTheme } from '@elastic/eui';
import {
  Background,
  Controls,
  MiniMap,
  type GetMiniMapNodeAttribute,
  type NodeMouseHandler,
  type NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useStoreApi,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import React, { useCallback, useEffect } from 'react';
import type { KiGraph, KiGraphNodeData } from './types';
import { KiGraphNode } from './ki_graph_node';
import type { KiGraphFlowEdge, KiGraphFlowNode, KiGraphFlowNodeData } from './use_ki_graph_layout';
import { getFocusViewport } from './get_focus_viewport';
import {
  getNeighborIds,
  KI_GRAPH_NODE_HEIGHT,
  KI_GRAPH_NODE_WIDTH,
  useKiGraphLayout,
} from './use_ki_graph_layout';

const FOCUS_MAX_ZOOM = 1.2;

const NODE_TYPES: NodeTypes = {
  kiNode: KiGraphNode,
};

const toKiGraphNodeData = ({
  kiId,
  index,
  kind,
  subtype,
  title,
  occurrences,
}: KiGraphFlowNodeData): KiGraphNodeData => ({
  kiId,
  index,
  kind,
  subtype,
  title,
  ...(occurrences !== undefined ? { occurrences } : {}),
});

interface KiGraphCanvasProps {
  graph: KiGraph;
  selectedId?: string;
  onSelect: (node: KiGraphNodeData | undefined) => void;
}

const KiGraphCanvasInner = ({ graph, selectedId, onSelect }: KiGraphCanvasProps) => {
  const { euiTheme, colorMode } = useEuiTheme();
  const { fitView, setCenter } = useReactFlow<KiGraphFlowNode, KiGraphFlowEdge>();
  const store = useStoreApi();
  const { nodes, edges } = useKiGraphLayout(graph, { selectedId });

  useEffect(() => {
    // Delayed so the canvas has resized for the side panel that opens on selection.
    const timeout = setTimeout(() => {
      if (selectedId === undefined) {
        fitView({ padding: 0.15, duration: 300 });
        return;
      }
      const { width, height, minZoom } = store.getState();
      const viewport = getFocusViewport({
        nodes,
        focusId: selectedId,
        visibleIds: getNeighborIds(graph.edges, selectedId),
        nodeWidth: KI_GRAPH_NODE_WIDTH,
        nodeHeight: KI_GRAPH_NODE_HEIGHT,
        canvasWidth: width,
        canvasHeight: height,
        minZoom,
        maxZoom: FOCUS_MAX_ZOOM,
      });
      if (viewport === undefined) {
        return;
      }
      setCenter(viewport.centerX, viewport.centerY, { zoom: viewport.zoom, duration: 400 });
    }, 100);
    return () => clearTimeout(timeout);
  }, [fitView, setCenter, store, graph, nodes, selectedId]);

  const reactFlowColorMode = colorMode === COLOR_MODES_STANDARD.dark ? 'dark' : 'light';

  const defaultEdgeOptions = {
    style: { stroke: euiTheme.colors.mediumShade, strokeWidth: 1.5 },
  };

  const handleNodeClick: NodeMouseHandler<KiGraphFlowNode> = useCallback(
    (_event, node) => {
      onSelect(toKiGraphNodeData(node.data));
    },
    [onSelect]
  );

  const handlePaneClick = useCallback(() => {
    onSelect(undefined);
  }, [onSelect]);

  const minimapNodeColor: GetMiniMapNodeAttribute<KiGraphFlowNode> = useCallback(
    ({ data }) => {
      if (data.kind === 'entity') {
        return euiTheme.colors.primary;
      }
      return euiTheme.colors.accent;
    },
    [euiTheme.colors.accent, euiTheme.colors.primary]
  );

  const backgroundDotColor = transparentize(euiTheme.colors.darkShade, 0.35);

  return (
    <div css={{ width: '100%', height: '100%' }} data-test-subj="contextKiGraphCanvas">
      <ReactFlow<KiGraphFlowNode, KiGraphFlowEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        defaultEdgeOptions={defaultEdgeOptions}
        colorMode={reactFlowColorMode}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        elevateNodesOnSelect={false}
        elevateEdgesOnSelect={false}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        onlyRenderVisibleElements
        minZoom={0.05}
        proOptions={{ hideAttribution: true }}
      >
        <Background bgColor={euiTheme.colors.backgroundBaseSubdued} color={backgroundDotColor} />
        <Controls showInteractive={false} />
        <MiniMap<KiGraphFlowNode>
          pannable
          zoomable
          position="bottom-right"
          bgColor={euiTheme.colors.backgroundBaseSubdued}
          maskColor={transparentize(euiTheme.colors.backgroundBaseSubdued, 0.7)}
          nodeColor={minimapNodeColor}
          nodeStrokeWidth={0}
          nodeBorderRadius={2}
          style={{
            width: 160,
            height: 126,
            boxSizing: 'border-box',
            background: euiTheme.colors.emptyShade,
            borderRadius: 4,
            overflow: 'hidden',
            boxShadow:
              '0 0 2px 0 rgba(43, 57, 79, 0.16), 0 1px 4px 0 rgba(43, 57, 79, 0.06), 0 2px 8px 0 rgba(43, 57, 79, 0.05)',
          }}
        />
      </ReactFlow>
    </div>
  );
};

export const KiGraphCanvas = (props: KiGraphCanvasProps) => (
  <ReactFlowProvider>
    <KiGraphCanvasInner {...props} />
  </ReactFlowProvider>
);
