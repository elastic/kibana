/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  COLOR_MODES_STANDARD,
  EuiEmptyPrompt,
  EuiText,
  keys,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
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
import type { KiGraph, KiGraphNodeData, KiGraphNodeKind } from './types';
import { getSpotlightModel } from './get_spotlight_model';
import { getKiGraphNodeMinimapColor } from './ki_graph_glyph_styles';
import { KiGraphEdge } from './ki_graph_edge';
import { kiGraphFocusDimmingCss } from './ki_graph_focus_styles';
import {
  applyKiGraphEdgeFocusStyles,
  applyKiGraphEdgeZIndex,
  applyKiGraphNodeZIndex,
} from './ki_graph_flow_z_index';
import { KiGraphLegend } from './ki_graph_legend';
import { KiGraphNode, type KiGraphRenderableFlowNode } from './ki_graph_node';
import { KiGraphSpotlight } from './ki_graph_spotlight';
import {
  KiGraphUiStoreProvider,
  useKiGraphUiStore,
  useKiGraphUiStoreActions,
} from './ki_graph_ui_store';
import type { KiGraphFlowEdge, KiGraphFlowNode } from './use_ki_graph_layout';
import {
  DEFAULT_EDGE_STROKE_WIDTH,
  DEFAULT_KI_GRAPH_LAYOUT_TUNING_PARAMS,
  type KiGraphLayoutTuningParams,
  useKiGraphLayout,
} from './use_ki_graph_layout';
import { useKiGraphLabelPlacement } from './use_visible_label_ids';
import {
  areAllKiGraphNodesHidden,
  buildKiGraphConnectedNodeIds,
  buildKiGraphLegendFilterEntries,
  createDefaultKiGraphFilterState,
  getVisibleKiGraph,
  isKiGraphEdgeHidden,
  isKiGraphNodeHidden,
  setKiGraphHideUnconnected,
  shouldClearKiGraphSelection,
  toggleKiGraphFilterKeyVisibility,
  type KiGraphFilterState,
} from './ki_graph_filter';

const SPOTLIGHT_ZOOM = 2.2;
const SPOTLIGHT_EXIT_ZOOM = 1.4;
const CAMERA_DURATION_MS = 500;
const FIT_PADDING = 0.15;
const KI_GRAPH_MINIMAP_MAX_NODES = 500;

const allNodesHiddenTitle = i18n.translate('xpack.contextEngine.kiGraph.canvas.allHiddenTitle', {
  defaultMessage: 'All node types are hidden',
});

const allNodesHiddenBody = i18n.translate('xpack.contextEngine.kiGraph.canvas.allHiddenBody', {
  defaultMessage: 'Turn on a legend filter to show nodes on the graph.',
});

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
  lastSeenAt,
}: KiGraphRenderableFlowNode['data']): KiGraphNodeData => ({
  kiId,
  index,
  kind,
  subtype,
  title,
  ...(occurrences !== undefined ? { occurrences } : {}),
  ...(lastSeenAt !== undefined ? { lastSeenAt } : {}),
});

export interface KiGraphCanvasProps {
  graph: KiGraph;
  selectedId?: string;
  onSelect: (node: KiGraphNodeData | undefined) => void;
  onViewDocument: (node: KiGraphNodeData) => void;
  isViewerOpen: boolean;
}

const KiGraphCanvasFlow = ({
  graph,
  selectedId,
  onSelect,
  onViewDocument,
  isViewerOpen,
}: KiGraphCanvasProps) => {
  const { euiTheme, colorMode } = useEuiTheme();
  const { fitView, setCenter, getNode } = useReactFlow<KiGraphFlowNode, KiGraphFlowEdge>();
  const [isSpotlightReady, setIsSpotlightReady] = useState(false);
  const [layoutParams, setLayoutParams] = useState<KiGraphLayoutTuningParams>(
    DEFAULT_KI_GRAPH_LAYOUT_TUNING_PARAMS
  );
  const skipLayoutFitViewRef = useRef(true);
  const skipGraphFitViewRef = useRef(true);
  const wasSpotlightOpenRef = useRef(false);
  const prevSelectedIdRef = useRef<string | undefined>(undefined);
  const readyTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [graphFilter, setGraphFilter] = useState<KiGraphFilterState>(() =>
    createDefaultKiGraphFilterState()
  );

  const { setHoveredId } = useKiGraphUiStoreActions();
  const hoveredId = useKiGraphUiStore((state) => state.hoveredId);
  const focusId = useKiGraphUiStore((state) => state.focusId);
  const focusActive = useKiGraphUiStore((state) => state.focusActive);
  const storeSelectedId = useKiGraphUiStore((state) => state.selectedId);

  const legendEntries = useMemo(() => buildKiGraphLegendFilterEntries(graph), [graph]);
  const nodeById = useMemo(() => new Map(graph.nodes.map((node) => [node.kiId, node])), [graph]);
  const connectedNodeIds = useMemo(() => buildKiGraphConnectedNodeIds(graph), [graph]);
  const visibleGraph = useMemo(
    () => getVisibleKiGraph(graph, graphFilter, connectedNodeIds),
    [graph, graphFilter, connectedNodeIds]
  );
  const hiddenNodeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const node of graph.nodes) {
      if (isKiGraphNodeHidden(node, graphFilter, connectedNodeIds)) {
        ids.add(node.kiId);
      }
    }
    return ids;
  }, [graph, graphFilter, connectedNodeIds]);
  const showAllHiddenEmptyState = areAllKiGraphNodesHidden(graph, graphFilter, connectedNodeIds);
  const visibleNodeCount = graph.nodes.length - hiddenNodeIds.size;
  const showMinimap = visibleNodeCount <= KI_GRAPH_MINIMAP_MAX_NODES;

  const {
    nodes: layoutNodes,
    edges: layoutEdges,
    labelNodes,
    layoutDurationMs,
  } = useKiGraphLayout(graph, layoutParams);
  const labelNodesForPlacement = useMemo(
    () => labelNodes.filter((node) => !hiddenNodeIds.has(node.id)),
    [labelNodes, hiddenNodeIds]
  );
  const { normalZoomLabelIds, lowZoomLabelIds } = useKiGraphLabelPlacement(labelNodesForPlacement);
  const spotlightModel = useMemo(
    () => (selectedId === undefined ? undefined : getSpotlightModel(visibleGraph, selectedId)),
    [visibleGraph, selectedId]
  );
  const isSpotlightOpen = selectedId !== undefined;

  const closeSpotlight = useCallback(() => {
    onSelect(undefined);
  }, [onSelect]);

  const handleToggleFilterKey = useCallback((key: string, kind: KiGraphNodeKind) => {
    setGraphFilter((current) => ({
      ...current,
      hiddenKeys: toggleKiGraphFilterKeyVisibility(current.hiddenKeys, key, kind),
    }));
  }, []);

  const handleHideUnconnectedChange = useCallback((hideUnconnected: boolean) => {
    setGraphFilter((current) => setKiGraphHideUnconnected(current, hideUnconnected));
  }, []);

  useEffect(() => {
    if (shouldClearKiGraphSelection(selectedId, graph, graphFilter, connectedNodeIds)) {
      onSelect(undefined);
    }
  }, [graph, graphFilter, connectedNodeIds, onSelect, selectedId]);

  useEffect(() => {
    if (hoveredId !== undefined && hiddenNodeIds.has(hoveredId)) {
      setHoveredId(undefined);
    }
  }, [hoveredId, hiddenNodeIds, setHoveredId]);

  const baseFlowNodes = useMemo((): KiGraphRenderableFlowNode[] => {
    return layoutNodes.map((node) => {
      const hidden = hiddenNodeIds.has(node.id);
      return {
        ...node,
        hidden,
        selectable: !hidden,
        data: {
          ...node.data,
          hasNormalLabel: normalZoomLabelIds.has(node.id),
          hasHubLabel: lowZoomLabelIds.has(node.id),
        },
      };
    });
  }, [layoutNodes, hiddenNodeIds, normalZoomLabelIds, lowZoomLabelIds]);

  const baseFlowEdges = useMemo(
    () =>
      layoutEdges.map((edge) => ({
        ...edge,
        hidden: isKiGraphEdgeHidden(
          nodeById.get(edge.source),
          nodeById.get(edge.target),
          graphFilter,
          connectedNodeIds
        ),
      })),
    [layoutEdges, graphFilter, connectedNodeIds, nodeById]
  );

  const nodes = useMemo(
    () => applyKiGraphNodeZIndex(baseFlowNodes, hoveredId, storeSelectedId),
    [baseFlowNodes, hoveredId, storeSelectedId]
  );

  const focusStyledEdges = useMemo(
    () =>
      applyKiGraphEdgeFocusStyles(baseFlowEdges, focusId, hoveredId, {
        defaultStroke: euiTheme.colors.mediumShade,
        highlightStroke: euiTheme.colors.primary,
      }),
    [baseFlowEdges, euiTheme.colors.mediumShade, euiTheme.colors.primary, focusId, hoveredId]
  );

  const flowEdges = useMemo(
    () => applyKiGraphEdgeZIndex(focusStyledEdges, focusId),
    [focusStyledEdges, focusId]
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
    readyTimeoutRef.current = setTimeout(() => setIsSpotlightReady(true), CAMERA_DURATION_MS);
  }, [setCenter, getNode, selectedId]);

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

  const handleNodeClick: NodeMouseHandler<KiGraphRenderableFlowNode> = useCallback(
    (_event, node) => {
      onSelect(toKiGraphNodeData(node.data));
    },
    [onSelect]
  );

  const handlePaneClick = useCallback(() => {
    closeSpotlight();
  }, [closeSpotlight]);

  const handleNodeMouseEnter: NodeMouseHandler<KiGraphRenderableFlowNode> = useCallback(
    (_event, node) => {
      if (!isSpotlightOpen && !node.hidden) {
        setHoveredId(node.id);
      }
    },
    [isSpotlightOpen, setHoveredId]
  );

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredId(undefined);
  }, [setHoveredId]);

  const handleMove: OnMove = useCallback(
    (event, viewport) => {
      if (event !== null && isSpotlightOpen && viewport.zoom < SPOTLIGHT_EXIT_ZOOM) {
        closeSpotlight();
      }
    },
    [isSpotlightOpen, closeSpotlight]
  );

  const minimapNodeColor: GetMiniMapNodeAttribute<KiGraphFlowNode> = useCallback(
    ({ data, hidden }) => {
      if (hidden) {
        return 'transparent';
      }
      return getKiGraphNodeMinimapColor(euiTheme, data.kind, data.subtype);
    },
    [euiTheme]
  );

  const handleSelectNeighbor = useCallback(
    (node: KiGraphNodeData) => {
      onSelect(node);
    },
    [onSelect]
  );

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
      css={css({ position: 'relative', width: '100%', height: '100%' }, kiGraphFocusDimmingCss)}
      data-ki-graph-focus={focusActive ? 'true' : 'false'}
      data-test-subj="contextKiGraphCanvas"
    >
      <ReactFlow<KiGraphRenderableFlowNode, KiGraphFlowEdge>
        nodes={nodes}
        edges={flowEdges}
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
        onlyRenderVisibleElements
        minZoom={0.05}
        maxZoom={8}
        proOptions={{ hideAttribution: true }}
      >
        <Background bgColor={euiTheme.colors.backgroundBaseSubdued} color={backgroundDotColor} />
        <Panel position="top-left">
          <KiGraphLegend
            entries={legendEntries}
            hiddenKeys={graphFilter.hiddenKeys}
            hideUnconnected={graphFilter.hideUnconnected}
            onToggleKey={handleToggleFilterKey}
            onHideUnconnectedChange={handleHideUnconnectedChange}
          />
        </Panel>
        <Panel position="top-right">
          <KiGraphLayoutTuningPanel
            value={layoutParams}
            layoutDurationMs={layoutDurationMs}
            onChange={setLayoutParams}
          />
        </Panel>
        <Controls showInteractive={false} />
        {showMinimap ? (
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
        ) : null}
      </ReactFlow>
      {showAllHiddenEmptyState ? (
        <div
          css={css({
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          })}
          data-test-subj="contextKiGraphCanvasAllHidden"
        >
          <EuiEmptyPrompt
            title={<h2>{allNodesHiddenTitle}</h2>}
            body={
              <EuiText size="s" color="subdued">
                {allNodesHiddenBody}
              </EuiText>
            }
            titleSize="s"
          />
        </div>
      ) : null}
      {isSpotlightReady && spotlightModel !== undefined ? (
        <KiGraphSpotlight
          model={spotlightModel}
          onSelectNeighbor={handleSelectNeighbor}
          onViewDocument={onViewDocument}
          onClose={closeSpotlight}
        />
      ) : null}
    </div>
  );
};

const KiGraphCanvasInner = (props: KiGraphCanvasProps) => (
  <KiGraphUiStoreProvider edges={props.graph.edges} selectedId={props.selectedId}>
    <KiGraphCanvasFlow {...props} />
  </KiGraphUiStoreProvider>
);

export const KiGraphCanvas = (props: KiGraphCanvasProps) => (
  <ReactFlowProvider>
    <KiGraphCanvasInner {...props} />
  </ReactFlowProvider>
);
