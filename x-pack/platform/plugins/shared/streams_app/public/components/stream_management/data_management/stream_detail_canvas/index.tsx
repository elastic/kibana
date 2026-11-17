/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiLoadingSpinner,
  EuiProgress,
  EuiScreenReaderOnly,
  useEuiTheme,
} from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useSelector } from '@xstate/react';
import {
  useEdgesState,
  useNodesState,
  type IsValidConnection,
  type NodeChange,
  type NodeMouseHandler,
  type OnConnect,
  type OnConnectStart,
  type OnNodesDelete,
  type OnReconnect,
  type XYPosition,
} from '@xyflow/react';
import type { ResolvedDestinationIndex } from '@kbn/streams-plugin/common';
import { useKibana } from '../../../../hooks/use_kibana';
import { useStreamsPrivileges } from '../../../../hooks/use_streams_privileges';
import { useTimefilter } from '../../../../hooks/use_timefilter';
import { useUnitId } from '../../../../hooks/use_unit_id';
import {
  buildUnitCanvasGraph,
  withRoutingDiagnostics,
  configuredDestinationNodeId,
  configuredSourceNodeId,
  readConfiguredDestinationId,
  readLineOrigin,
  readLineTarget,
} from './build_unit_connection_edges';
import {
  CanvasContextMenu,
  type CanvasContextMenuTarget,
  type ContextMenuPosition,
} from './canvas_context_menu';
import { CanvasEmptyState } from './canvas_empty_state';
import { applyCanvasSearch, resolveCanvasSearch } from './canvas_search';
import { CanvasSearchBar } from './canvas_search_bar';
import { CanvasSearchOverlay } from './canvas_search_overlay';
import { CanvasShell, getCanvasContainerStyles } from './canvas_shell';
import { ConnectionTargetsProvider } from './nodes/connection_handle';
import { CanvasToolbar } from './canvas_toolbar';
import { CanvasReadOnlyProvider } from './canvas_read_only_context';
import { UnitReadOnlyCallout } from '../../../streams_layout/unit_read_only_callout';
import { applyLayout, getConnectedNodeIds } from './layout';
import { getGraphNodeIds, syncCanvasNodeMetadata, syncCanvasEdgeData } from './sync_graph_nodes';
import { useCanvasKeyboardShortcuts } from './use_canvas_a11y';
import { useCanvasHistory } from './use_canvas_history';
import { useSyncStatsWithSavedUnit } from './use_sync_stats_with_saved_unit';
import { IndexInspectFlyout } from '../../../index_inspect/index_inspect_flyout';
import type { IndexInspectTabId } from '../../../index_inspect/types';
import {
  DESTINATION_NODE_TYPE,
  PROCESSING_NODE_TYPE,
  ROUTING_NODE_TYPE,
  SOURCE_NODE_TYPE,
  type ClassicCanvasEdge,
  type ClassicCanvasGraph,
  type ClassicCanvasNode,
  type DestinationNode,
  type SourceNode,
} from './types';
import { useKbnUrlStateStorageFromRouterContext } from '../../../../util/kbn_url_state_context';
import {
  CanvasStateContextProvider,
  useBindCanvasCreateHistory,
  useCanvasEvents,
  useCanvasHasUnsavedChanges,
  useCanvasIsInitializing,
  useCanvasIsSaving,
  useCanvasIsSavingProcessing,
  useCanvasRoutingStagedUnit,
  useCanvasIsUnitUnavailable,
  useCanvasNodePositions,
  useCanvasUnitDefinition,
  useCanvasDestinationsRef,
  useCanvasSourcesRef,
  useCanvasUrlRef,
  useCanvasRoutingDiagnostics,
  useCanvasRoutingFlyout,
  useCanvasProcessingFlyout,
} from './state_management';
import {
  useSourceApiKeyGenerationDeps,
  useSourceEnvironmentLoader,
  useSources,
} from '../../../streams_layout/sources/sources_context';
import { createUnitRepository, type Unit } from '../../../../services/unit_repository';
import type { SourceType, SourceViewModel } from '../../../streams_layout/sources/types';
import { SOURCE_TYPE_CONFIG_BY_TYPE } from '../../../streams_layout/sources/source_type_config';
import {
  getSourceDisplaySignals,
  getUnitSources,
  withUnitSources,
} from '../../../streams_layout/sources/source_models';
import { CreateSourceModal } from '../../../streams_layout/sources/create_source_modal';
import { SourceDetailsFlyout } from '../../../streams_layout/sources/source_details_flyout';
import { useDestinations } from '../../../streams_layout/destinations/destinations_context';
import { CreateDestinationModal } from '../../../streams_layout/destinations/create_destination_modal';
import { UnitDestinationFlyout } from '../../../streams_layout/destinations/unit_destination_flyout';
import type {
  DestinationViewModel,
  ElasticsearchDestinationViewModel,
} from '../../../streams_layout/destinations/types';
import { DESTINATION_SIGNAL_LABELS } from '../../../streams_layout/destinations/destination_type_config';
import {
  getDestinationIndices,
  getUnitDestinations,
  withUnitDestinations,
} from '../../../streams_layout/destinations/destination_models';
import {
  canConnectLine,
  canMoveLine,
  connectLine,
  disconnectLine,
  moveLine,
  removeComponentFromPipelines,
  type UnitLineMove,
  type UnitLineOrigin,
  type UnitLineTarget,
} from '../../../../services/unit_connections';
import { RoutingFlyout } from '../../../stream_routing_flyout';
import { ProcessingFlyout } from '../../../stream_processing_flyout';
import { STATS_POLL_INTERVAL_MS } from '../../../unit_stats/state_management/constants';
import { StatsManagerProvider } from '../../../unit_stats/state_management/use_stats_manager';

const KEYBOARD_INSTRUCTIONS_ID = 'streamsCanvasKbdInstructions';

const noop = () => {};
const NO_DESTINATION_INDICES: ResolvedDestinationIndex[] = [];
const canvasColumnStyles = css`
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  flex-direction: column;
`;
const SOURCE_TYPE_ICONS: Record<SourceType, IconType> = {
  async_bulk: 'logoElasticsearch',
  bulk: 'logoElasticsearch',
  otlp: 'logoObservability',
  es_otlp: 'logoObservability',
  prometheus_remote_write: 'logoPrometheus',
  es_prometheus_remote_write: 'logoPrometheus',
};

interface CanvasContextMenuState {
  position: ContextMenuPosition;
  target: CanvasContextMenuTarget;
}

/**
 * Renders unit sources and destinations wired by each source pipeline.
 */
export function StreamsCanvas() {
  const {
    core,
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const { timeState, timeState$ } = useTimefilter();
  const unitId = useUnitId();
  const urlStateStorageContainer = useKbnUrlStateStorageFromRouterContext();
  const apiKeyGenerationDeps = useSourceApiKeyGenerationDeps();
  const loadSourceEnvironment = useSourceEnvironmentLoader();
  const unitDefinitionRepository = useMemo(
    () =>
      createUnitRepository({ streamsRepositoryClient, unitId, toasts: core.notifications.toasts }),
    [core.notifications.toasts, streamsRepositoryClient, unitId]
  );

  return (
    <CanvasStateContextProvider
      core={core}
      urlStateStorageContainer={urlStateStorageContainer}
      apiKeyGenerationDeps={apiKeyGenerationDeps}
      timeState={timeState}
      timeState$={timeState$}
      loadSourceEnvironment={loadSourceEnvironment}
      loadUnitDefinition={unitDefinitionRepository.load}
      persistUnitDefinition={unitDefinitionRepository.persist}
    >
      <StatsManagerProvider unitId={unitId} pollIntervalMs={STATS_POLL_INTERVAL_MS}>
        <StreamsCanvasInner />
      </StatsManagerProvider>
    </CanvasStateContextProvider>
  );
}

function StreamsCanvasInner() {
  useSyncStatsWithSavedUnit();
  const { euiTheme } = useEuiTheme();
  const {
    v2: { manage: canManage },
  } = useStreamsPrivileges();
  const readOnly = !canManage;
  const { flyoutName, flyoutKind, flyoutTab, query } = useCanvasUrlRef();
  const {
    openFlyout,
    closeFlyout,
    selectTab,
    changeSearchQuery,
    updateNodePositions,
    restoreNodePositions,
    saveUnit,
    changeUnitConnection,
    openProcessingFlyout,
    openRoutingFlyout,
  } = useCanvasEvents();
  const unitDefinition = useCanvasUnitDefinition();
  const hasUnsavedChanges = useCanvasHasUnsavedChanges();
  const isSaving = useCanvasIsSaving();
  const isSavingProcessing = useCanvasIsSavingProcessing();
  const routingStagedUnit = useCanvasRoutingStagedUnit();
  const isInitializing = useCanvasIsInitializing();
  const isUnitUnavailable = useCanvasIsUnitUnavailable();
  const nodePositions = useCanvasNodePositions();
  const routingFlyout = useCanvasRoutingFlyout();
  const routingDiagnostics = useCanvasRoutingDiagnostics();
  const processingFlyout = useCanvasProcessingFlyout();
  const nodePositionsRef = useRef(nodePositions);
  useEffect(() => {
    nodePositionsRef.current = nodePositions;
  }, [nodePositions]);
  const sourcesActorRef = useCanvasSourcesRef();
  const destinationsActorRef = useCanvasDestinationsRef();
  const isSourceEnvironmentLoading = useSelector(sourcesActorRef, (state) =>
    state.matches({ environment: 'loading' })
  );
  const hasReceivedUnit = useSelector(sourcesActorRef, (state) => state.context.hasReceivedUnit);
  const hasReceivedDestinationsUnit = useSelector(
    destinationsActorRef,
    (state) => state.context.hasReceivedUnit
  );
  const sourcesController = useSources({ sourcesActorRef });
  const destinationsController = useDestinations({ destinationsActorRef });
  const {
    sources,
    selectedSource,
    isCreateModalOpen,
    openCreateModal,
    closeCreateModal,
    openSourceFlyout,
    closeSourceFlyout,
  } = sourcesController;
  const {
    destinations,
    resolvedIndicesByDestination,
    resolvedIndicesStatus,
    resolvedIndicesError,
    isCreateModalOpen: isCreateDestinationModalOpen,
    openCreateModal: openCreateDestinationModal,
    closeCreateModal: closeCreateDestinationModal,
  } = destinationsController;

  const openIndexFlyout = useCallback(
    (name: string, initialTab: IndexInspectTabId = 'overview') => {
      openFlyout(name, 'index');
      selectTab(initialTab);
    },
    [openFlyout, selectTab]
  );
  const openDestinationFlyout = useCallback(
    (destinationId: string) => {
      openFlyout(destinationId, 'destination');
    },
    [openFlyout]
  );

  const graph = useMemo<ClassicCanvasGraph>(() => {
    const { processingNodes, routingNodes, edges } = buildUnitCanvasGraph(
      unitDefinition,
      sources.map((source) => source.id),
      destinations.map((destination) => destination.id)
    );
    const connectedDestinationIds = new Set(
      edges.flatMap((edge) => {
        const destinationId = readConfiguredDestinationId(edge.target);
        return destinationId ? [destinationId] : [];
      })
    );
    const configuredSourceNodes = sources.map(buildConfiguredSourceNode);
    const configuredDestinationNodes = destinations.map((destination) =>
      buildConfiguredDestinationNode(
        destination,
        connectedDestinationIds.has(destination.id),
        resolvedIndicesByDestination.get(destination.id)?.map((index) => index.name) ?? []
      )
    );
    const graphNodes = [
      ...configuredSourceNodes,
      ...processingNodes,
      ...withRoutingDiagnostics(routingNodes, routingDiagnostics),
      ...configuredDestinationNodes,
    ];
    return {
      nodes: applyLayout(graphNodes, edges),
      edges,
    };
  }, [destinations, resolvedIndicesByDestination, routingDiagnostics, sources, unitDefinition]);

  // Local (non-persisted) node state so nodes can be dragged around the canvas.
  // Metadata-only updates (e.g. index count after resolved indices reload) are
  // merged onto the live nodes so a user's in-progress tidy or keyboard move is
  // not wiped.
  const [nodes, setNodes, applyNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);
  const liveNodesRef = useRef(nodes);
  liveNodesRef.current = nodes;
  const [contextMenu, setContextMenu] = useState<CanvasContextMenuState | null>(null);

  const searchedFlow = useMemo(() => resolveCanvasSearch(graph, query), [graph, query]);
  const visible = useMemo(
    () => applyCanvasSearch(nodes, edges, searchedFlow),
    [nodes, edges, searchedFlow]
  );
  const canEditConnections = !readOnly && !isSaving;
  // A per-edge `reconnectable` overrides the canvas-wide `edgesReconnectable`, so lock each edge.
  const visibleEdges = useMemo(
    () =>
      canEditConnections
        ? visible.edges
        : visible.edges.map((edge) => ({ ...edge, reconnectable: false })),
    [canEditConnections, visible.edges]
  );
  const restoreHistory = useCallback(
    (extra: CanvasEditSnapshot) => {
      if (extra.unit !== unitDefinition) {
        changeUnitConnection(extra.unit);
      }
      // Stored positions go back with the unit, or the graph sync below would
      // re-apply the ones written after this snapshot was taken.
      if (extra.nodePositions !== nodePositions) {
        restoreNodePositions(extra.nodePositions);
      }
    },
    [changeUnitConnection, nodePositions, restoreNodePositions, unitDefinition]
  );
  const { record, hold, reset, discard, undo, redo, canUndo, canRedo } = useCanvasHistory({
    nodes,
    edges,
    extra: {
      unit: unitDefinition,
      nodePositions,
    },
    setNodes,
    setEdges,
    onRestore: restoreHistory,
  });
  // The machine holds this canvas when a create save starts, then resets the
  // stack on persist success so undo cannot restore a destination / source whose key was revoked.
  useBindCanvasCreateHistory({ hold, reset, discard });

  // The unit an edit on this canvas last staged, until the graph sync below sees
  // it. This is how the sync tells a node the user just placed from one that
  // undo, redo or a reload brought in.
  const userEditUnitRef = useRef<Unit>();
  const stageUserEdit = useCallback(
    (next: Unit) => {
      record();
      userEditUnitRef.current = next;
      changeUnitConnection(next);
    },
    [changeUnitConnection, record]
  );

  // The routing flyout stages its rules in the machine, not through stageUserEdit.
  // Each staged unit counts as an edit once, so undo or redo back to it does not.
  const seenRoutingStagedUnitRef = useRef<Unit>();

  const graphNodeIdsRef = useRef('');
  const graphEdgeIdsRef = useRef('');
  const knownNodeIdsRef = useRef<ReadonlySet<string>>(new Set());

  useEffect(() => {
    const isRoutingStage =
      routingStagedUnit === unitDefinition &&
      seenRoutingStagedUnitRef.current !== routingStagedUnit;
    if (isRoutingStage) {
      seenRoutingStagedUnitRef.current = routingStagedUnit;
    }
    const isUserEdit = userEditUnitRef.current === unitDefinition || isRoutingStage;
    if (userEditUnitRef.current === unitDefinition) {
      userEditUnitRef.current = undefined;
    }
    const nextNodeIds = getGraphNodeIds(graph.nodes);
    const nextEdgeIds = graph.edges.map((edge) => edge.id).join('\n');
    if (graphNodeIdsRef.current === nextNodeIds) {
      setNodes((current) => syncCanvasNodeMetadata(current, graph.nodes));
      if (graphEdgeIdsRef.current !== nextEdgeIds) {
        graphEdgeIdsRef.current = nextEdgeIds;
        setEdges(graph.edges);
      } else {
        setEdges((current) => syncCanvasEdgeData(current, graph.edges));
      }
      return;
    }
    graphNodeIdsRef.current = nextNodeIds;
    graphEdgeIdsRef.current = nextEdgeIds;

    const knownNodeIds = knownNodeIdsRef.current;
    knownNodeIdsRef.current = new Set(graph.nodes.map((node) => node.id));

    const positionedNodes = graph.nodes.map((node) => {
      const storedPosition = nodePositionsRef.current[node.id];
      return storedPosition ? { ...node, position: storedPosition } : node;
    });
    setEdges(graph.edges);

    // A routing or processing node placed on a line makes that flow one column
    // longer, so tidy the flow it joined as "Tidy up selection" would with that
    // flow selected. Other flows keep their positions. Only an edit on this canvas
    // or a routing or processing flyout save places a node: one that the initial load, undo,
    // redo or a reload brings in keeps its stored position.
    const placedNodeIds = new Set(
      isUserEdit || isSavingProcessing
        ? graph.nodes
            .filter(
              ({ id, type }) =>
                (type === ROUTING_NODE_TYPE || type === PROCESSING_NODE_TYPE) &&
                !knownNodeIds.has(id)
            )
            .map(({ id }) => id)
        : []
    );
    if (placedNodeIds.size === 0) {
      setNodes(positionedNodes);
      return;
    }

    // Tidy from where the nodes are on screen right now, as the menu action does.
    const liveNodesById = new Map(liveNodesRef.current.map((node) => [node.id, node]));
    const liveNodes = positionedNodes.map((node) => {
      const liveNode = liveNodesById.get(node.id);
      return liveNode
        ? { ...node, position: liveNode.position, measured: liveNode.measured }
        : node;
    });
    const flowNodeIds = getConnectedNodeIds(placedNodeIds, graph.edges);
    // The placed node is not on screen yet, so keep the flow where its other nodes are.
    const tidiedNodes = applyLayout(liveNodes, graph.edges, {
      onlyIds: flowNodeIds,
      anchorIds: new Set([...flowNodeIds].filter((id) => !placedNodeIds.has(id))),
    });
    setNodes(tidiedNodes);
    // Store the tidied positions so the next graph change does not undo them.
    updateNodePositions(
      Object.fromEntries(
        tidiedNodes
          .filter(({ id }) => flowNodeIds.has(id))
          .map(({ id, position }) => [id, position])
      )
    );
  }, [
    graph,
    unitDefinition,
    isSavingProcessing,
    routingStagedUnit,
    setNodes,
    setEdges,
    updateNodePositions,
  ]);

  // Tracks whether a pointer drag is in progress so we snapshot each gesture
  // exactly once.
  const isPointerDraggingRef = useRef(false);

  const onNodesChange = useCallback(
    (changes: Array<NodeChange<ClassicCanvasNode>>) => {
      const positionChanges = changes.filter((change) => change.type === 'position');
      const isDragStart = positionChanges.some((change) => 'dragging' in change && change.dragging);
      const isDragEnd = positionChanges.some(
        (change) => 'dragging' in change && change.dragging === false
      );

      let shouldRecord = false;
      if (isDragStart) {
        // First move of a pointer drag: snapshot the pre-drag state once.
        if (!isPointerDraggingRef.current) {
          isPointerDraggingRef.current = true;
          shouldRecord = true;
        }
      } else if (isDragEnd) {
        if (isPointerDraggingRef.current) {
          // Ends a pointer drag; already snapshotted at drag start.
          isPointerDraggingRef.current = false;
        } else {
          // A keyboard-driven move with no preceding drag.
          shouldRecord = true;
        }
      }

      if (shouldRecord) {
        record();
      }
      const completedPositions = Object.fromEntries(
        positionChanges.flatMap((change) =>
          'position' in change && change.position && change.dragging === false
            ? [[change.id, change.position]]
            : []
        )
      );
      if (Object.keys(completedPositions).length > 0) {
        updateNodePositions(completedPositions);
      }
      applyNodesChange(changes);
    },
    [applyNodesChange, record, updateNodePositions]
  );

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  // A single node has no tidy action, so suppress the native menu without
  // opening ours. Should be updated once we have more actions
  const onNodeContextMenu = useCallback<NodeMouseHandler<ClassicCanvasNode>>(
    (event) => {
      event.preventDefault();
      closeContextMenu();
    },
    [closeContextMenu]
  );

  const onPaneContextMenu = useCallback((event: MouseEvent | React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({ position: { x: event.clientX, y: event.clientY }, target: 'pane' });
  }, []);

  // React Flow fires this (instead of onNodeContextMenu) when the right-click
  // lands on the multi-selection overlay. Only offer "Tidy up selection" for a
  // genuine multi-selection (two or more nodes).
  const onSelectionContextMenu = useCallback(
    (event: React.MouseEvent, selectedNodes: ClassicCanvasNode[]) => {
      event.preventDefault();
      if (selectedNodes.length < 2) {
        closeContextMenu();
        return;
      }
      setContextMenu({ position: { x: event.clientX, y: event.clientY }, target: 'selection' });
    },
    [closeContextMenu]
  );

  const [connectionTargetIds, setConnectionTargetIds] = useState<ReadonlySet<string> | null>(null);

  const readConnectionOrigin = useCallback(
    (nodeId: string | null | undefined, handleId: string | null | undefined) =>
      readLineOrigin(graph.nodes, nodeId, handleId),
    [graph.nodes]
  );
  const readConnectionTarget = useCallback(
    (nodeId: string | null | undefined) => readLineTarget(graph.nodes, nodeId),
    [graph.nodes]
  );

  // The line being moved, if any. Drops are then checked as a move of that line,
  // so a rule can swap its one connection for another target.
  const reconnectingRef = useRef<Pick<UnitLineMove, 'previousOrigin' | 'previousTarget'> | null>(
    null
  );

  const canDropConnection = useCallback(
    (origin: UnitLineOrigin, target: UnitLineTarget): boolean => {
      const reconnecting = reconnectingRef.current;
      return reconnecting
        ? canMoveLine(unitDefinition, { ...reconnecting, origin, target })
        : canConnectLine(unitDefinition, origin, target);
    },
    [unitDefinition]
  );

  const onReconnectStart = useCallback<
    NonNullable<React.ComponentProps<typeof CanvasShell>['onReconnectStart']>
  >(
    (_event, edge) => {
      const previousOrigin = readConnectionOrigin(edge.source, edge.sourceHandle);
      const previousTarget = readConnectionTarget(edge.target);
      reconnectingRef.current =
        previousOrigin && previousTarget ? { previousOrigin, previousTarget } : null;
    },
    [readConnectionOrigin, readConnectionTarget]
  );

  const onConnect = useCallback<OnConnect>(
    (connection) => {
      const origin = readConnectionOrigin(connection.source, connection.sourceHandle);
      const target = readConnectionTarget(connection.target);
      if (!origin || !target) {
        return;
      }
      stageUserEdit(connectLine(unitDefinition, origin, target));
    },
    [readConnectionOrigin, readConnectionTarget, stageUserEdit, unitDefinition]
  );

  const onConnectStart = useCallback<OnConnectStart>(
    (_event, params) => {
      const origin =
        params.handleType === 'source'
          ? readConnectionOrigin(params.nodeId, params.handleId)
          : undefined;
      if (!origin) {
        setConnectionTargetIds(null);
        return;
      }
      const targets = graph.nodes
        .map(({ id }) => id)
        .filter((id) => {
          const target = readConnectionTarget(id);
          return target && canDropConnection(origin, target);
        });
      setConnectionTargetIds(new Set(targets));
    },
    [canDropConnection, graph.nodes, readConnectionOrigin, readConnectionTarget]
  );

  const clearConnectionTargets = useCallback(() => {
    setConnectionTargetIds(null);
  }, []);

  const isValidConnection = useCallback<IsValidConnection>(
    (connection) => {
      const origin = readConnectionOrigin(connection.source, connection.sourceHandle);
      const target = readConnectionTarget(connection.target);
      return origin !== undefined && target !== undefined && canDropConnection(origin, target);
    },
    [canDropConnection, readConnectionOrigin, readConnectionTarget]
  );

  const onReconnect = useCallback<OnReconnect>(
    (oldEdge, connection) => {
      if (!canEditConnections) {
        return;
      }
      const previousOrigin = readConnectionOrigin(oldEdge.source, oldEdge.sourceHandle);
      const previousTarget = readConnectionTarget(oldEdge.target);
      const origin = readConnectionOrigin(connection.source, connection.sourceHandle);
      const target = readConnectionTarget(connection.target);
      if (!previousOrigin || !previousTarget || !origin || !target) {
        return;
      }
      const next = moveLine(unitDefinition, { previousOrigin, previousTarget, origin, target });
      // Dropping the line back where it started changes nothing, so it is not an undo step.
      if (next === unitDefinition) {
        return;
      }
      stageUserEdit(next);
    },
    [canEditConnections, readConnectionOrigin, readConnectionTarget, stageUserEdit, unitDefinition]
  );

  const onReconnectEnd = useCallback<
    NonNullable<React.ComponentProps<typeof CanvasShell>['onReconnectEnd']>
  >(
    (_event, edge, _handleType, connectionState) => {
      reconnectingRef.current = null;
      // Dropping on a handle keeps or moves the line. Releasing on the canvas unhooks it.
      if (!canEditConnections || connectionState.toHandle) {
        return;
      }
      const origin = readConnectionOrigin(edge.source, edge.sourceHandle);
      const target = readConnectionTarget(edge.target);
      if (!origin || !target) {
        return;
      }
      const next = disconnectLine(unitDefinition, origin, target);
      // A line that cannot be unhooked (a delegated child's last destination) snaps back.
      if (next === unitDefinition) {
        return;
      }
      stageUserEdit(next);
    },
    [canEditConnections, readConnectionOrigin, readConnectionTarget, stageUserEdit, unitDefinition]
  );

  const onNodesDelete = useCallback<OnNodesDelete<ClassicCanvasNode>>(
    (deletedNodes) => {
      const removedSourceIds: string[] = [];
      const removedDestinationIds: string[] = [];
      for (const node of deletedNodes) {
        if (node.type === SOURCE_NODE_TYPE && node.data.sourceId) {
          removedSourceIds.push(node.data.sourceId);
          continue;
        }
        if (node.type === DESTINATION_NODE_TYPE && node.data.destinationId) {
          removedDestinationIds.push(node.data.destinationId);
        }
      }
      if (removedSourceIds.length === 0 && removedDestinationIds.length === 0) {
        return;
      }
      stageUserEdit(
        withoutDeletedComponents(unitDefinition, removedSourceIds, removedDestinationIds)
      );
      if (flyoutName && removedDestinationIds.includes(flyoutName)) {
        closeFlyout();
      }
    },
    [closeFlyout, flyoutName, stageUserEdit, unitDefinition]
  );

  const onNodeClick = useCallback<NodeMouseHandler<ClassicCanvasNode>>(
    (event, node) => {
      if (event.target instanceof Element && event.target.closest('.react-flow__handle')) {
        return;
      }
      if (node.type === PROCESSING_NODE_TYPE && !event.shiftKey) {
        event.preventDefault();
        openProcessingFlyout(node.data.ref);
        return;
      }
      if (node.type === ROUTING_NODE_TYPE && !event.shiftKey) {
        event.preventDefault();
        openRoutingFlyout({ kind: 'pipeline', pipelineId: node.data.pipelineId }, readOnly);
        return;
      }
      if (node.type === SOURCE_NODE_TYPE && node.data.sourceId && !event.shiftKey) {
        event.preventDefault();
        openSourceFlyout(node.data.sourceId);
        return;
      }
      if (node.type === DESTINATION_NODE_TYPE && node.data.destinationId && !event.shiftKey) {
        event.preventDefault();
        openDestinationFlyout(node.data.destinationId);
      }
    },
    [openDestinationFlyout, openProcessingFlyout, openRoutingFlyout, openSourceFlyout, readOnly]
  );

  const reopenContextMenu = useCallback(
    (position: ContextMenuPosition) => setContextMenu({ position, target: 'pane' }),
    []
  );

  // Tidy the whole graph (pane) or just the current multi-selection, snapshotting
  // first so it undoes as one step.
  const onTidyUp = useCallback(() => {
    if (!contextMenu) {
      return;
    }
    const { target } = contextMenu;
    record();
    setNodes((current) => {
      if (target === 'pane') {
        return applyLayout(current, edges);
      }
      const selectedIds = new Set(current.filter((node) => node.selected).map((node) => node.id));
      return applyLayout(current, edges, { onlyIds: selectedIds });
    });
    closeContextMenu();
  }, [contextMenu, record, setNodes, edges, closeContextMenu]);

  // Guarded so keyboard shortcuts do not fire when there is nothing to undo/redo.
  const handleUndo = useCallback(() => {
    if (!canUndo || isSaving) {
      return;
    }
    undo();
  }, [canUndo, isSaving, undo]);

  const handleRedo = useCallback(() => {
    if (!canRedo || isSaving) {
      return;
    }
    redo();
  }, [canRedo, isSaving, redo]);

  const addSource = useCallback(() => {
    openCreateModal();
  }, [openCreateModal]);

  const addDestination = useCallback(() => {
    openCreateDestinationModal();
  }, [openCreateDestinationModal]);

  // Escape closes the context menu and clears any node selection.
  const onEscape = useCallback(() => {
    closeContextMenu();
    setNodes((current) =>
      current.some((node) => node.selected)
        ? current.map((node) => (node.selected ? { ...node, selected: false } : node))
        : current
    );
  }, [closeContextMenu, setNodes]);

  const onEnter = useCallback(() => {
    const selected = nodes.filter((node) => node.selected);
    // Disregard if more than one node is selected for whatever reason.
    if (selected.length === 1) {
      const selectedNode = selected[0];
      if (selectedNode.type === PROCESSING_NODE_TYPE) {
        openProcessingFlyout(selectedNode.data.ref);
      }
      if (selectedNode.type === ROUTING_NODE_TYPE) {
        openRoutingFlyout({ kind: 'pipeline', pipelineId: selectedNode.data.pipelineId }, readOnly);
      }
      if (selectedNode.type === SOURCE_NODE_TYPE && selectedNode.data.sourceId) {
        openSourceFlyout(selectedNode.data.sourceId);
      }
      if (selectedNode.type === DESTINATION_NODE_TYPE && selectedNode.data.destinationId) {
        openDestinationFlyout(selectedNode.data.destinationId);
      }
    }
  }, [
    nodes,
    openDestinationFlyout,
    openProcessingFlyout,
    openRoutingFlyout,
    openSourceFlyout,
    readOnly,
  ]);

  useCanvasKeyboardShortcuts({
    onUndo: readOnly ? noop : handleUndo,
    onRedo: readOnly ? noop : handleRedo,
    onEscape,
    onEnter,
  });

  // Hold the spinner until the unit, the source environment, and the first
  // unit.loaded sync have settled. Resolved indices refresh in the background.
  const isCanvasLoading =
    isInitializing ||
    isSourceEnvironmentLoading ||
    ((!hasReceivedUnit || !hasReceivedDestinationsUnit) && !isUnitUnavailable);

  const searchBar = <CanvasSearchBar query={query ?? ''} onQueryChange={changeSearchQuery} />;

  if (isCanvasLoading) {
    return (
      <div css={canvasColumnStyles}>
        {searchBar}
        <EuiFlexGroup
          justifyContent="center"
          alignItems="center"
          css={getCanvasContainerStyles(euiTheme)}
        >
          <EuiLoadingSpinner size="xl" data-test-subj="streamsCanvasLoading" />
        </EuiFlexGroup>
      </div>
    );
  }

  const flyoutDestination =
    flyoutName && flyoutKind !== 'index'
      ? destinations.find((destination) => destination.id === flyoutName)
      : undefined;
  const flyoutIndexName =
    flyoutName && flyoutKind === 'index'
      ? flyoutName
      : flyoutName && !flyoutKind && !flyoutDestination
      ? flyoutName
      : undefined;

  return (
    <div css={canvasColumnStyles}>
      {searchBar}
      {readOnly && (
        <div
          css={css`
            flex: 0 0 auto;
            padding: ${euiTheme.size.m};
          `}
        >
          <UnitReadOnlyCallout />
        </div>
      )}
      {!readOnly && (hasUnsavedChanges || isSaving) && (
        <EuiFlexGroup
          responsive={false}
          justifyContent="flexEnd"
          css={css`
            flex: 0 0 auto;
            padding: ${euiTheme.size.m};
            border-bottom: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
            background: ${euiTheme.colors.backgroundBasePlain};
          `}
        >
          <EuiButton
            size="s"
            fill
            onClick={saveUnit}
            isDisabled={!hasUnsavedChanges || isSaving}
            isLoading={isSaving}
            data-test-subj="streamsCanvasSaveChanges"
          >
            {i18n.translate('xpack.streams.canvas.saveChangesButtonLabel', {
              defaultMessage: 'Save changes',
            })}
          </EuiButton>
        </EuiFlexGroup>
      )}
      <CanvasReadOnlyProvider value={readOnly}>
        <ConnectionTargetsProvider value={connectionTargetIds}>
          <CanvasShell<ClassicCanvasNode, ClassicCanvasEdge>
            nodes={visible.nodes}
            edges={visibleEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodesDelete={onNodesDelete}
            deleteKeyCode={
              readOnly ||
              isSaving ||
              sourcesController.isCreatingSource ||
              destinationsController.isCreatingDestination
                ? null
                : ['Backspace', 'Delete']
            }
            onConnect={onConnect}
            onConnectStart={onConnectStart}
            onConnectEnd={clearConnectionTargets}
            onReconnect={onReconnect}
            onReconnectStart={onReconnectStart}
            onReconnectEnd={onReconnectEnd}
            isValidConnection={isValidConnection}
            nodesConnectable={canEditConnections}
            edgesReconnectable={canEditConnections}
            nodesDraggable={!readOnly && !isSaving}
            zoomControlsDisabled={isSaving}
            connectionLineStyle={{ stroke: euiTheme.colors.primary, strokeWidth: 1 }}
            onNodeClick={onNodeClick}
            onNodeContextMenu={readOnly ? undefined : onNodeContextMenu}
            onPaneContextMenu={readOnly ? undefined : onPaneContextMenu}
            onSelectionContextMenu={readOnly ? undefined : onSelectionContextMenu}
            ariaLabel={i18n.translate('xpack.streams.canvas.regionAriaLabel', {
              defaultMessage: 'Streams map',
            })}
            ariaDescribedById={KEYBOARD_INSTRUCTIONS_ID}
          >
            {resolvedIndicesStatus === 'loading' && (
              <EuiProgress
                size="xs"
                color="primary"
                position="absolute"
                data-test-subj="streamsCanvasRefreshing"
                aria-label={i18n.translate('xpack.streams.canvas.refreshingLabel', {
                  defaultMessage: 'Refreshing indices',
                })}
              />
            )}
            {nodes.length === 0 && <CanvasEmptyState />}
            <CanvasSearchOverlay flow={searchedFlow} />
            {flyoutDestination ? (
              <UnitDestinationFlyout
                destination={flyoutDestination}
                indices={
                  resolvedIndicesByDestination.get(flyoutDestination.id) ?? NO_DESTINATION_INDICES
                }
                indicesStatus={resolvedIndicesStatus}
                indicesError={resolvedIndicesError}
                destinationDetailRef={destinationsController.destinationDetailRefs.get(
                  flyoutDestination.id
                )}
                onShowDestinationDetail={destinationsController.showDestinationDetail}
                onHideDestinationDetail={destinationsController.hideDestinationDetail}
                onClose={closeFlyout}
                isDeleteDisabled={isSaving}
                readOnly={readOnly}
                onIndexClick={openIndexFlyout}
                onDelete={() => {
                  destinationsController.deleteDestination(flyoutDestination.id);
                  closeFlyout();
                }}
              />
            ) : (
              flyoutIndexName && (
                <IndexInspectFlyout
                  indexName={flyoutIndexName}
                  onClose={closeFlyout}
                  selectedTab={flyoutTab}
                  onSelectTab={selectTab}
                />
              )
            )}
            {selectedSource && (
              <SourceDetailsFlyout
                sources={sourcesController}
                source={selectedSource}
                onClose={closeSourceFlyout}
                readOnly={readOnly}
              />
            )}
            {!readOnly && isCreateModalOpen && (
              <CreateSourceModal sources={sourcesController} onClose={closeCreateModal} />
            )}
            {!readOnly && isCreateDestinationModalOpen && (
              <CreateDestinationModal
                destinations={destinationsController}
                onClose={closeCreateDestinationModal}
              />
            )}
            {routingFlyout ? (
              <RoutingFlyout
                key={routingFlyout.ref?.sessionId}
                flyout={routingFlyout}
                onBeforeSave={record}
                readOnly={readOnly}
              />
            ) : null}
            {processingFlyout ? (
              <ProcessingFlyout
                key={processingFlyout.ref.sessionId}
                flyout={processingFlyout}
                readOnly={readOnly}
              />
            ) : null}
            <EuiScreenReaderOnly>
              <p id={KEYBOARD_INSTRUCTIONS_ID}>
                {i18n.translate('xpack.streams.canvas.keyboardInstructions', {
                  defaultMessage:
                    'Use Tab to move between nodes. Use the arrow keys to reposition the focused node. Press Delete to remove a selected source or destination. Press Control or Command plus Z to undo, add Shift to redo. Press Escape to close menus and clear the selection.',
                })}
              </p>
            </EuiScreenReaderOnly>
            {!readOnly && (
              <CanvasToolbar
                onUndo={handleUndo}
                onRedo={handleRedo}
                onAddSource={addSource}
                onAddDestination={addDestination}
                canUndo={canUndo && !isSaving}
                canRedo={canRedo && !isSaving}
                canAdd={!isSaving}
              />
            )}
            <CanvasContextMenu
              position={contextMenu?.position ?? null}
              target={contextMenu?.target ?? 'pane'}
              onTidyUp={onTidyUp}
              onReopen={reopenContextMenu}
              onClose={closeContextMenu}
            />
          </CanvasShell>
        </ConnectionTargetsProvider>
      </CanvasReadOnlyProvider>
    </div>
  );
}

const buildConfiguredSourceNode = (source: SourceViewModel): SourceNode => {
  const signals = getSourceDisplaySignals(source, source.supportedTelemetry);
  const name = source.name ?? source.id;
  const type = SOURCE_TYPE_CONFIG_BY_TYPE[source.type].label;
  return {
    id: configuredSourceNodeId(source.id),
    type: SOURCE_NODE_TYPE,
    position: { x: 0, y: 0 },
    deletable: true,
    ariaLabel:
      signals.length > 0
        ? i18n.translate('xpack.streams.canvas.configuredSourceNode.withSignalsAriaLabel', {
            defaultMessage: 'Source: {name}, {type}, {signal}',
            values: {
              name,
              type,
              signal: signals.map((signal) => DESTINATION_SIGNAL_LABELS[signal]).join(', '),
            },
          })
        : i18n.translate('xpack.streams.canvas.configuredSourceNode.ariaLabel', {
            defaultMessage: 'Source: {name}, {type}',
            values: { name, type },
          }),
    data: {
      sourceId: source.id,
      sourceType: source.type,
      title: name,
      subtitle: SOURCE_TYPE_CONFIG_BY_TYPE[source.type].shortLabel,
      iconType: SOURCE_TYPE_ICONS[source.type],
      signals,
    },
  };
};

const getDestinationSubtitle = (destination: ElasticsearchDestinationViewModel): string => {
  const indices = getDestinationIndices(destination);
  if (destination.mode === 'auto' || indices.length === 0) {
    return i18n.translate('xpack.streams.canvas.configuredDestinationNode.autoLabel', {
      defaultMessage: 'Auto',
    });
  }
  if (indices.length === 1) {
    return indices[0];
  }
  return i18n.translate('xpack.streams.canvas.configuredDestinationNode.fixedIndicesLabel', {
    defaultMessage: '{count} fixed indices',
    values: { count: indices.length },
  });
};

const getEndpointHost = (endpoint: string): string => {
  try {
    return new URL(endpoint).host || endpoint;
  } catch {
    return endpoint;
  }
};

export const buildConfiguredDestinationNode = (
  destination: DestinationViewModel,
  hasConnectedSource: boolean,
  targetedIndexNames: string[]
): DestinationNode => {
  const signal = destination.signals.map((value) => DESTINATION_SIGNAL_LABELS[value]).join(', ');
  const noSourceLabel = i18n.translate(
    'xpack.streams.canvas.configuredDestinationNode.noSourceLabel',
    { defaultMessage: 'No source' }
  );
  if (destination.type !== 'elasticsearch') {
    const location =
      destination.type === 's3'
        ? { bucket: destination.bucket }
        : {
            endpoint: destination.endpoint,
            remoteIndexNames: [...new Set(Object.values(destination.indexBySignal))],
          };
    return {
      id: configuredDestinationNodeId(destination.id),
      type: DESTINATION_NODE_TYPE,
      position: { x: 0, y: 0 },
      deletable: true,
      ariaLabel: hasConnectedSource
        ? i18n.translate('xpack.streams.canvas.configuredDestinationNode.nonLocalAriaLabel', {
            defaultMessage: 'Destination: {name}, {signal}',
            values: { name: destination.name, signal },
          })
        : i18n.translate(
            'xpack.streams.canvas.configuredDestinationNode.nonLocalNoSourceAriaLabel',
            {
              defaultMessage: 'Destination: {name}, {signal}, no source',
              values: { name: destination.name, signal },
            }
          ),
      data: {
        destinationId: destination.id,
        destinationType: destination.type,
        signals: destination.signals,
        ...location,
        title: destination.name,
        subtitle: !hasConnectedSource
          ? noSourceLabel
          : destination.description ||
            (destination.type === 's3'
              ? destination.bucket
              : getEndpointHost(destination.endpoint)),
      },
    };
  }
  return {
    id: configuredDestinationNodeId(destination.id),
    type: DESTINATION_NODE_TYPE,
    position: { x: 0, y: 0 },
    deletable: true,
    ariaLabel: hasConnectedSource
      ? i18n.translate('xpack.streams.canvas.configuredDestinationNode.ariaLabel', {
          defaultMessage:
            'Destination: {name}, {signal}, {indexCount, plural, one {# index} other {# indices}}',
          values: {
            name: destination.name,
            signal,
            indexCount: targetedIndexNames.length,
          },
        })
      : i18n.translate('xpack.streams.canvas.configuredDestinationNode.noSourceAriaLabel', {
          defaultMessage:
            'Destination: {name}, {signal}, {indexCount, plural, one {# index} other {# indices}}, no source',
          values: {
            name: destination.name,
            signal,
            indexCount: targetedIndexNames.length,
          },
        }),
    data: {
      destinationId: destination.id,
      destinationType: destination.type,
      signals: destination.signals,
      streamName: getDestinationIndices(destination).join(' ') || undefined,
      indexCount: targetedIndexNames.length,
      targetedIndexNames,
      title: destination.name,
      subtitle: !hasConnectedSource
        ? noSourceLabel
        : destination.description || getDestinationSubtitle(destination),
    },
  };
};

interface CanvasEditSnapshot {
  unit: Unit;
  nodePositions: Record<string, XYPosition>;
}

const withoutDeletedComponents = (
  unit: Unit,
  sourceIds: readonly string[],
  destinationIds: readonly string[]
): Unit => {
  const removedSources = new Set(sourceIds);
  const removedDestinations = new Set(destinationIds);
  const withoutComponents = withUnitDestinations(
    withUnitSources(
      unit,
      getUnitSources(unit).filter(({ id }) => !removedSources.has(id))
    ),
    getUnitDestinations(unit).filter(({ id }) => !removedDestinations.has(id))
  );
  return [...sourceIds, ...destinationIds].reduce(
    (nextUnit, componentId) => removeComponentFromPipelines(nextUnit, componentId),
    withoutComponents
  );
};
