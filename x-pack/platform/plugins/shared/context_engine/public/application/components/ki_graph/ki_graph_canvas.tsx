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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KiGraphLayoutTuningPanel } from './ki_graph_layout_tuning_panel';
import type { KiGraph, KiGraphNodeData } from './types';
import { getMemorySpotlightModel } from './get_memory_spotlight_model';
import { getSpotlightModel } from './get_spotlight_model';
import { getKiGraphNodeMinimapColor } from './ki_graph_glyph_styles';
import { KiGraphEdge } from './ki_graph_edge';
import { KiGraphLegend } from './ki_graph_legend';
import { KiGraphNode } from './ki_graph_node';
import type { KiGraphSource } from './ki_graph_source';
import { KiGraphSpotlight } from './ki_graph_spotlight';
import type { KiGraphFlowEdge, KiGraphFlowNode, KiGraphFlowNodeData } from './use_ki_graph_layout';
import {
  DEFAULT_EDGE_STROKE_WIDTH,
  DEFAULT_KI_GRAPH_LAYOUT_TUNING_PARAMS,
  type KiGraphLayoutTuningParams,
  useKiGraphLayout,
} from './use_ki_graph_layout';
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
  onViewSource: (source: KiGraphSource) => void;
  isViewerOpen: boolean;
}

const KiGraphCanvasInner = ({
  aiIndexId,
  graph,
  selectedId,
  onSelect,
  onViewDocument,
  onViewSource,
  isViewerOpen,
}: KiGraphCanvasProps) => {
  const { euiTheme, colorMode } = useEuiTheme();
  const { fitView, setCenter, getNode } = useReactFlow<KiGraphFlowNode, KiGraphFlowEdge>();
  const [hoveredId, setHoveredId] = useState<string | undefined>();
  const [memorySource, setMemorySource] = useState<KiGraphSource | undefined>();
  const [isSpotlightReady, setIsSpotlightReady] = useState(false);
  const [layoutParams, setLayoutParams] = useState<KiGraphLayoutTuningParams>(
    DEFAULT_KI_GRAPH_LAYOUT_TUNING_PARAMS
  );
  const skipLayoutFitViewRef = useRef(true);
  const skipGraphFitViewRef = useRef(true);
  const wasSpotlightOpenRef = useRef(false);
  const prevSelectedIdRef = useRef<string | undefined>(undefined);
  const readyTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const {
    nodes: layoutNodes,
    edges,
    labelNodes,
    layoutDurationMs,
  } = useKiGraphLayout(
    graph,
    { selectedId: memorySource === undefined ? selectedId : undefined, hoveredId },
    layoutParams
  );
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
  const memorySpotlightModel = useMemo(
    () =>
      memorySource === undefined
        ? undefined
        : getMemorySpotlightModel(graph, memorySource.id, memorySource),
    [graph, memorySource]
  );
  const isSpotlightOpen = selectedId !== undefined || memorySource !== undefined;

  const closeSpotlight = useCallback(() => {
    setMemorySource(undefined);
    onSelect(undefined);
  }, [onSelect]);

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
    if (skipLayoutFitViewRef.current) {
      skipLayoutFitViewRef.current = false;
      return;
    }
    const frame = requestAnimationFrame(() => {
      fitView({ padding: FIT_PADDING, duration: 300 });
    });
    return () => cancelAnimationFrame(frame);
  }, [layoutParams, fitView]);

  useEffect(() => {
    if (skipGraphFitViewRef.current) {
      skipGraphFitViewRef.current = false;
      return;
    }
    const frame = requestAnimationFrame(() => {
      fitView({ padding: FIT_PADDING, duration: 300 });
    });
    return () => cancelAnimationFrame(frame);
  }, [graph, fitView]);

  useEffect(() => {
    const spotlightWasOpen = wasSpotlightOpenRef.current;
    const prevSelectedId = prevSelectedIdRef.current;

    if (memorySource !== undefined) {
      setIsSpotlightReady(true);
      wasSpotlightOpenRef.current = true;
      return;
    }

    if (selectedId === undefined) {
      clearTimeout(readyTimeoutRef.current);
      setIsSpotlightReady(false);
      wasSpotlightOpenRef.current = false;
      prevSelectedIdRef.current = undefined;
      return;
    }

    const selected = getNode(selectedId);
    if (selected === undefined) {
      setIsSpotlightReady(false);
      wasSpotlightOpenRef.current = true;
      prevSelectedIdRef.current = selectedId;
      return;
    }

    const spotlightStaysOpen =
      spotlightWasOpen && prevSelectedId !== undefined && selectedId === prevSelectedId;
    const neighborSelected =
      spotlightWasOpen && prevSelectedId !== undefined && selectedId !== prevSelectedId;

    if (spotlightStaysOpen || neighborSelected) {
      wasSpotlightOpenRef.current = true;
      prevSelectedIdRef.current = selectedId;
      return;
    }

    setIsSpotlightReady(false);
    wasSpotlightOpenRef.current = true;
    prevSelectedIdRef.current = selectedId;

    const centerX = selected.position.x + (selected.width ?? 0) / 2;
    const centerY = selected.position.y + (selected.height ?? 0) / 2;
    setCenter(centerX, centerY, { zoom: SPOTLIGHT_ZOOM, duration: CAMERA_DURATION_MS });
    // Not cleared on cleanup: a re-run mid-glide takes the "stays open" branch and must not lose it.
    readyTimeoutRef.current = setTimeout(() => setIsSpotlightReady(true), CAMERA_DURATION_MS);
  }, [setCenter, getNode, selectedId, memorySource]);

  useEffect(() => () => clearTimeout(readyTimeoutRef.current), []);

  useEffect(() => {
    if (!isSpotlightOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== keys.ESCAPE || isViewerOpen) {
        return;
      }
      closeSpotlight();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSpotlightOpen, closeSpotlight, isViewerOpen]);

  const reactFlowColorMode = colorMode === COLOR_MODES_STANDARD.dark ? 'dark' : 'light';

  const handleNodeClick: NodeMouseHandler<KiGraphFlowNode> = useCallback(
    (_event, node) => {
      setMemorySource(undefined);
      onSelect(toKiGraphNodeData(node.data));
    },
    [onSelect]
  );

  const handlePaneClick = useCallback(() => {
    closeSpotlight();
  }, [closeSpotlight]);

  const handleNodeMouseEnter: NodeMouseHandler<KiGraphFlowNode> = useCallback(
    (_event, node) => {
      if (!isSpotlightOpen) {
        setHoveredId(node.id);
      }
    },
    [isSpotlightOpen]
  );

  const handleNodeMouseLeave: NodeMouseHandler<KiGraphFlowNode> = useCallback(() => {
    setHoveredId(undefined);
  }, []);

  // Only user gestures carry an event, so the programmatic camera glide never exits.
  const handleMove: OnMove = useCallback(
    (event, viewport) => {
      if (event !== null && isSpotlightOpen && viewport.zoom < SPOTLIGHT_EXIT_ZOOM) {
        closeSpotlight();
      }
    },
    [isSpotlightOpen, closeSpotlight]
  );

  const minimapNodeColor: GetMiniMapNodeAttribute<KiGraphFlowNode> = useCallback(
    ({ data }) => getKiGraphNodeMinimapColor(euiTheme, data.kind, data.subtype),
    [euiTheme]
  );

  const handleSelectNeighbor = useCallback(
    (node: KiGraphNodeData) => {
      setMemorySource(undefined);
      onSelect(node);
    },
    [onSelect]
  );

  const handleSelectSource = useCallback((source: KiGraphSource) => {
    setMemorySource(source);
  }, []);

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
        <Panel position="top-right">
          <KiGraphLayoutTuningPanel
            value={layoutParams}
            layoutDurationMs={layoutDurationMs}
            onChange={setLayoutParams}
          />
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
      {isSpotlightReady &&
      (memorySpotlightModel !== undefined ||
        (memorySource === undefined && spotlightModel !== undefined)) ? (
        <KiGraphSpotlight
          model={memorySource === undefined ? spotlightModel : undefined}
          memory={memorySpotlightModel}
          onSelectNeighbor={handleSelectNeighbor}
          onViewDocument={onViewDocument}
          onViewSource={onViewSource}
          onSelectSource={handleSelectSource}
          onClose={closeSpotlight}
          sources={memorySource === undefined ? sources : undefined}
          isLoadingSources={memorySource === undefined ? isLoadingSources : false}
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
