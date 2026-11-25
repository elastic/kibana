/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COLOR_MODES_STANDARD, keys, transparentize, useEuiTheme } from '@elastic/eui';
import {
  Background,
  Controls,
  MiniMap,
  Panel,
  type EdgeTypes,
  type GetMiniMapNodeAttribute,
  type NodeMouseHandler,
  type NodeTypes,
  type OnMove,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { KiGraph, KiGraphNodeData } from './types';
import { getSpotlightModel } from './get_spotlight_model';
import { getKiGraphNodeMinimapColor } from './ki_graph_glyph_styles';
import { KiGraphEdge } from './ki_graph_edge';
import { KiGraphLegend } from './ki_graph_legend';
import { KiGraphNode } from './ki_graph_node';
import { KiGraphSpotlight } from './ki_graph_spotlight';
import type { KiGraphFlowEdge, KiGraphFlowNode, KiGraphFlowNodeData } from './use_ki_graph_layout';
import { DEFAULT_EDGE_STROKE_WIDTH, useKiGraphLayout } from './use_ki_graph_layout';
import { useKiGraphSources } from './use_ki_graph_sources';
import { useVisibleLabelIds } from './use_visible_label_ids';

const SPOTLIGHT_ZOOM = 2.2;
const SPOTLIGHT_EXIT_ZOOM = 1.4;
const CAMERA_DURATION_MS = 500;
const FIT_PADDING = 0.15;

const NODE_TYPES: NodeTypes = {
  kiNode: KiGraphNode,
};

const EDGE_TYPES: EdgeTypes = {
  kiEdge: KiGraphEdge,
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
  aiIndexId: string;
  graph: KiGraph;
  selectedId?: string;
  onSelect: (node: KiGraphNodeData | undefined) => void;
  onViewDocument: (node: KiGraphNodeData) => void;
}

const KiGraphCanvasInner = ({
  aiIndexId,
  graph,
  selectedId,
  onSelect,
  onViewDocument,
}: KiGraphCanvasProps) => {
  const { euiTheme, colorMode } = useEuiTheme();
  const { fitView, setCenter, getNode } = useReactFlow<KiGraphFlowNode, KiGraphFlowEdge>();
  const [hoveredId, setHoveredId] = useState<string | undefined>();
  const [isSpotlightReady, setIsSpotlightReady] = useState(false);
  const {
    nodes: layoutNodes,
    edges,
    labelNodes,
  } = useKiGraphLayout(graph, { selectedId, hoveredId });
  const visibleLabelIds = useVisibleLabelIds(labelNodes);
  const selectedNode = useMemo(
    () => (selectedId === undefined ? undefined : graph.nodes.find((n) => n.kiId === selectedId)),
    [graph.nodes, selectedId]
  );
  const { sources, isLoading: isLoadingSources } = useKiGraphSources(aiIndexId, selectedNode);
  const spotlightModel = useMemo(
    () => (selectedId === undefined ? undefined : getSpotlightModel(graph, selectedId)),
    [graph, selectedId]
  );

  const nodes = useMemo(
    () =>
      layoutNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          showLabel: node.data.isLabelForced || visibleLabelIds.has(node.id),
        },
      })),
    [layoutNodes, visibleLabelIds]
  );

  useEffect(() => {
    setIsSpotlightReady(false);

    const selected = selectedId === undefined ? undefined : getNode(selectedId);
    if (selectedId === undefined || selected === undefined) {
      const fitTimeout = setTimeout(() => fitView({ padding: FIT_PADDING, duration: 300 }), 100);
      return () => clearTimeout(fitTimeout);
    }

    const centerX = selected.position.x + (selected.width ?? 0) / 2;
    const centerY = selected.position.y + (selected.height ?? 0) / 2;
    setCenter(centerX, centerY, { zoom: SPOTLIGHT_ZOOM, duration: CAMERA_DURATION_MS });
    // The wires are anchored to the cards, so the overlay waits for the camera to settle.
    const readyTimeout = setTimeout(() => setIsSpotlightReady(true), CAMERA_DURATION_MS);
    return () => clearTimeout(readyTimeout);
  }, [fitView, setCenter, getNode, graph, selectedId]);

  useEffect(() => {
    if (selectedId === undefined) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === keys.ESCAPE) {
        onSelect(undefined);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, onSelect]);

  const reactFlowColorMode = colorMode === COLOR_MODES_STANDARD.dark ? 'dark' : 'light';

  const handleNodeClick: NodeMouseHandler<KiGraphFlowNode> = useCallback(
    (_event, node) => {
      onSelect(toKiGraphNodeData(node.data));
    },
    [onSelect]
  );

  const handlePaneClick = useCallback(() => {
    onSelect(undefined);
  }, [onSelect]);

  const handleNodeMouseEnter: NodeMouseHandler<KiGraphFlowNode> = useCallback(
    (_event, node) => {
      if (selectedId === undefined) {
        setHoveredId(node.id);
      }
    },
    [selectedId]
  );

  const handleNodeMouseLeave: NodeMouseHandler<KiGraphFlowNode> = useCallback(() => {
    setHoveredId(undefined);
  }, []);

  // Only user gestures carry an event, so the programmatic camera glide never exits.
  const handleMove: OnMove = useCallback(
    (event, viewport) => {
      if (event !== null && selectedId !== undefined && viewport.zoom < SPOTLIGHT_EXIT_ZOOM) {
        onSelect(undefined);
      }
    },
    [selectedId, onSelect]
  );

  const minimapNodeColor: GetMiniMapNodeAttribute<KiGraphFlowNode> = useCallback(
    ({ data }) => getKiGraphNodeMinimapColor(euiTheme, data.kind, data.subtype),
    [euiTheme]
  );

  const handleCloseSpotlight = useCallback(() => {
    onSelect(undefined);
  }, [onSelect]);

  const backgroundDotColor = transparentize(euiTheme.colors.darkShade, 0.35);

  const defaultEdgeOptions = useMemo(
    () => ({
      type: 'kiEdge' as const,
      style: { stroke: euiTheme.colors.mediumShade, strokeWidth: DEFAULT_EDGE_STROKE_WIDTH },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 10,
        height: 10,
        color: euiTheme.colors.mediumShade,
      },
    }),
    [euiTheme.colors.mediumShade]
  );

  return (
    <div
      css={{ position: 'relative', width: '100%', height: '100%' }}
      data-test-subj="contextKiGraphCanvas"
    >
      <ReactFlow<KiGraphFlowNode, KiGraphFlowEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        defaultEdgeOptions={defaultEdgeOptions}
        colorMode={reactFlowColorMode}
        onNodeClick={handleNodeClick}
        onNodeMouseEnter={handleNodeMouseEnter}
        onNodeMouseLeave={handleNodeMouseLeave}
        onPaneClick={handlePaneClick}
        onMove={handleMove}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        elevateNodesOnSelect={false}
        elevateEdgesOnSelect={false}
        fitView
        fitViewOptions={{ padding: FIT_PADDING }}
        onlyRenderVisibleElements={false}
        minZoom={0.05}
        maxZoom={8}
        proOptions={{ hideAttribution: true }}
      >
        <Background bgColor={euiTheme.colors.backgroundBaseSubdued} color={backgroundDotColor} />
        <Panel position="top-left">
          <KiGraphLegend />
        </Panel>
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
      {spotlightModel !== undefined && isSpotlightReady ? (
        <KiGraphSpotlight
          model={spotlightModel}
          onSelectNeighbor={onSelect}
          onViewDocument={onViewDocument}
          onClose={handleCloseSpotlight}
          sources={sources}
          isLoadingSources={isLoadingSources}
        />
      ) : null}
    </div>
  );
};

export const KiGraphCanvas = (props: KiGraphCanvasProps) => (
  <ReactFlowProvider>
    <KiGraphCanvasInner {...props} />
  </ReactFlowProvider>
);
