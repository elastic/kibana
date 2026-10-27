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
} from '@xyflow/react';
import { useKibana } from '../../../../hooks/use_kibana';
import {
  buildUnitCanvasGraph,
  configuredDestinationNodeId,
  configuredRoutingNodeId,
  configuredSourceNodeId,
  readConfiguredDestinationId,
  routingRuleHandleId,
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
import { applyLayout } from './layout';
import { getGraphNodeIds, syncCanvasNodeMetadata } from './sync_graph_nodes';
import { useCanvasKeyboardShortcuts } from './use_canvas_a11y';
import { useCanvasHistory } from './use_canvas_history';
import { IndexInspectFlyout } from '../../../index_inspect/index_inspect_flyout';
import type { IndexInspectTabId } from '../../../index_inspect/types';
import {
  DESTINATION_NODE_TYPE,
  PROCESSING_NODE_TYPE,
  ROUTING_NODE_TYPE,
  SOURCE_NODE_TYPE,
  type ClassicCanvasGraph,
  type ClassicCanvasNode,
  type DestinationNode,
  type RoutingNode,
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
  useCanvasIsUnitUnavailable,
  useCanvasNodePositions,
  useCanvasUnitDefinition,
  useCanvasDestinationsRef,
  useCanvasSourcesRef,
  useCanvasUrlRef,
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
import type { DestinationViewModel } from '../../../streams_layout/destinations/types';
import { DESTINATION_SIGNAL_LABELS } from '../../../streams_layout/destinations/destination_type_config';
import {
  getUnitDestinations,
  withUnitDestinations,
} from '../../../streams_layout/destinations/destination_models';
import {
  hasSourceConnection,
  removeComponentFromPipelines,
} from '../../../../services/unit_connections';
import {
  canConnectOrigin,
  canMoveOriginConnection,
  connectOrigin,
  disconnectOrigin,
  moveOriginConnection,
  readConnectionOrigin as readOrigin,
  readConnectionTarget as readTarget,
  type ConnectionOrigin,
  type OriginConnectionMove,
  type ProcessingRefsByNodeId,
  type RouteTarget,
} from './connection_origin';
import { getUnitRoutings } from '../../../streams_layout/routing/routing_models';
import type { RoutingViewModel } from '../../../streams_layout/routing/types';
import { RoutingFlyout } from '../../../stream_routing_flyout';
import { ProcessingFlyout } from '../../../stream_processing_flyout';

const KEYBOARD_INSTRUCTIONS_ID = 'streamsCanvasKbdInstructions';
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
  const urlStateStorageContainer = useKbnUrlStateStorageFromRouterContext();
  const apiKeyGenerationDeps = useSourceApiKeyGenerationDeps();
  const loadSourceEnvironment = useSourceEnvironmentLoader();
  const unitDefinitionRepository = useMemo(
    () => createUnitRepository({ streamsRepositoryClient, toasts: core.notifications.toasts }),
    [core.notifications.toasts, streamsRepositoryClient]
  );

  return (
    <CanvasStateContextProvider
      core={core}
      urlStateStorageContainer={urlStateStorageContainer}
      apiKeyGenerationDeps={apiKeyGenerationDeps}
      loadSourceEnvironment={loadSourceEnvironment}
      loadUnitDefinition={unitDefinitionRepository.load}
      persistUnitDefinition={unitDefinitionRepository.persist}
    >
      <StreamsCanvasInner />
    </CanvasStateContextProvider>
  );
}

function StreamsCanvasInner() {
  const { euiTheme } = useEuiTheme();
  const { flyoutName, flyoutKind, flyoutTab, query } = useCanvasUrlRef();
  const {
    openFlyout,
    closeFlyout,
    selectTab,
    changeSearchQuery,
    updateNodePositions,
    saveUnit,
    changeUnitConnection,
    openProcessingFlyout,
  } = useCanvasEvents();
  const unitDefinition = useCanvasUnitDefinition();
  const hasUnsavedChanges = useCanvasHasUnsavedChanges();
  const isSaving = useCanvasIsSaving();
  const isInitializing = useCanvasIsInitializing();
  const isUnitUnavailable = useCanvasIsUnitUnavailable();
  const nodePositions = useCanvasNodePositions();
  const [routingFlyout, mode] = useCanvasRoutingFlyout();
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
    const routings = getUnitRoutings(unitDefinition);
    const { processingNodes, edges } = buildUnitCanvasGraph(
      unitDefinition,
      sources.map((source) => source.id),
      destinations.map((destination) => destination.id),
      routings
    );
    const connectedDestinationIds = new Set(
      edges.flatMap((edge) => {
        const destinationId = readConfiguredDestinationId(edge.target);
        return destinationId ? [destinationId] : [];
      })
    );
    const configuredSourceNodes = sources.map((source) =>
      buildConfiguredSourceNode(source, hasSourceConnection(unitDefinition, source.id))
    );
    const configuredDestinationNodes = destinations.map((destination) =>
      buildConfiguredDestinationNode(
        destination,
        connectedDestinationIds.has(destination.id),
        resolvedIndicesByDestination[destination.id]?.map((index) => index.name) ?? []
      )
    );
    const graphNodes = [
      ...configuredSourceNodes,
      ...processingNodes,
      ...routings.map(buildRoutingNode),
      ...configuredDestinationNodes,
    ];
    return {
      nodes: applyLayout(graphNodes, edges),
      edges,
    };
  }, [destinations, resolvedIndicesByDestination, sources, unitDefinition]);

  // Local (non-persisted) node state so nodes can be dragged around the canvas.
  // Metadata-only updates (e.g. index count after resolved indices reload) are
  // merged onto the live nodes so a user's in-progress tidy or keyboard move is
  // not wiped.
  const [nodes, setNodes, applyNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);
  const [contextMenu, setContextMenu] = useState<CanvasContextMenuState | null>(null);

  const searchedFlow = useMemo(() => resolveCanvasSearch(graph, query), [graph, query]);
  const visible = useMemo(
    () => applyCanvasSearch(nodes, edges, searchedFlow),
    [nodes, edges, searchedFlow]
  );
  const restoreHistory = useCallback(
    (extra: CanvasEditSnapshot) => {
      if (extra.unit !== unitDefinition) {
        changeUnitConnection(extra.unit);
      }
    },
    [changeUnitConnection, unitDefinition]
  );
  const { record, hold, reset, discard, undo, redo, canUndo, canRedo } = useCanvasHistory({
    nodes,
    edges,
    extra: {
      unit: unitDefinition,
    },
    setNodes,
    setEdges,
    onRestore: restoreHistory,
  });
  // The machine holds this canvas when a create save starts, then resets the
  // stack on persist success so undo cannot restore a destination / source whose key was revoked.
  useBindCanvasCreateHistory({ hold, reset, discard });
  const graphNodeIdsRef = useRef('');
  const graphEdgeIdsRef = useRef('');

  useEffect(() => {
    const nextNodeIds = getGraphNodeIds(graph.nodes);
    const nextEdgeIds = graph.edges.map((edge) => edge.id).join('\n');
    if (graphNodeIdsRef.current === nextNodeIds) {
      setNodes((current) => syncCanvasNodeMetadata(current, graph.nodes));
      if (graphEdgeIdsRef.current !== nextEdgeIds) {
        graphEdgeIdsRef.current = nextEdgeIds;
        setEdges(graph.edges);
      }
      return;
    }
    graphNodeIdsRef.current = nextNodeIds;
    graphEdgeIdsRef.current = nextEdgeIds;

    setNodes(
      graph.nodes.map((node) => {
        const storedPosition = nodePositionsRef.current[node.id];
        return storedPosition ? { ...node, position: storedPosition } : node;
      })
    );
    setEdges(graph.edges);
  }, [graph, setNodes, setEdges]);

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

  const processingRefsByNodeId = useMemo<ProcessingRefsByNodeId>(
    () =>
      new Map(
        graph.nodes.flatMap((node) =>
          node.type === PROCESSING_NODE_TYPE ? [[node.id, node.data.ref] as const] : []
        )
      ),
    [graph.nodes]
  );
  const routingIds = useMemo(
    () =>
      new Set(
        graph.nodes.flatMap((node) =>
          node.type === ROUTING_NODE_TYPE ? [node.data.pipelineId] : []
        )
      ),
    [graph.nodes]
  );
  const readConnectionOrigin = useCallback(
    (nodeId: string | null | undefined, handleId: string | null | undefined) =>
      readOrigin(nodeId, handleId, processingRefsByNodeId),
    [processingRefsByNodeId]
  );
  const readConnectionTarget = useCallback(
    (nodeId: string | null | undefined) => readTarget(nodeId, processingRefsByNodeId, routingIds),
    [processingRefsByNodeId, routingIds]
  );

  // The line being moved, if any. Drops are then checked as a move of that line,
  // so a source or rule can swap its one connection for another target.
  const reconnectingRef = useRef<Pick<
    OriginConnectionMove,
    'previousOrigin' | 'previousTarget'
  > | null>(null);

  const canDropConnection = useCallback(
    (origin: ConnectionOrigin, target: RouteTarget): boolean => {
      const reconnecting = reconnectingRef.current;
      return reconnecting
        ? canMoveOriginConnection(unitDefinition, { ...reconnecting, origin, target })
        : canConnectOrigin(unitDefinition, origin, target);
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
      record();
      changeUnitConnection(connectOrigin(unitDefinition, origin, target));
    },
    [changeUnitConnection, readConnectionOrigin, readConnectionTarget, record, unitDefinition]
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
      const previousOrigin = readConnectionOrigin(oldEdge.source, oldEdge.sourceHandle);
      const previousTarget = readConnectionTarget(oldEdge.target);
      const origin = readConnectionOrigin(connection.source, connection.sourceHandle);
      const target = readConnectionTarget(connection.target);
      if (!previousOrigin || !previousTarget || !origin || !target) {
        return;
      }
      const next = moveOriginConnection(unitDefinition, {
        previousOrigin,
        previousTarget,
        origin,
        target,
      });
      // Dropping the line back where it started changes nothing, so it is not an undo step.
      if (next === unitDefinition) {
        return;
      }
      record();
      changeUnitConnection(next);
    },
    [changeUnitConnection, readConnectionOrigin, readConnectionTarget, record, unitDefinition]
  );

  const onReconnectEnd = useCallback<
    NonNullable<React.ComponentProps<typeof CanvasShell>['onReconnectEnd']>
  >(
    (_event, edge, _handleType, connectionState) => {
      reconnectingRef.current = null;
      // Dropping on a handle keeps or moves the line. Releasing on the canvas unhooks it.
      if (connectionState.toHandle) {
        return;
      }
      const origin = readConnectionOrigin(edge.source, edge.sourceHandle);
      const target = readConnectionTarget(edge.target);
      if (!origin || !target) {
        return;
      }
      record();
      changeUnitConnection(disconnectOrigin(unitDefinition, origin, target));
    },
    [changeUnitConnection, readConnectionOrigin, readConnectionTarget, record, unitDefinition]
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
      record();
      changeUnitConnection(
        withoutDeletedComponents(unitDefinition, removedSourceIds, removedDestinationIds)
      );
      if (flyoutName && removedDestinationIds.includes(flyoutName)) {
        closeFlyout();
      }
    },
    [changeUnitConnection, closeFlyout, flyoutName, record, unitDefinition]
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
    [openDestinationFlyout, openProcessingFlyout, openSourceFlyout]
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
      if (selectedNode.type === SOURCE_NODE_TYPE && selectedNode.data.sourceId) {
        openSourceFlyout(selectedNode.data.sourceId);
      }
      if (selectedNode.type === DESTINATION_NODE_TYPE && selectedNode.data.destinationId) {
        openDestinationFlyout(selectedNode.data.destinationId);
      }
    }
  }, [nodes, openDestinationFlyout, openProcessingFlyout, openSourceFlyout]);

  useCanvasKeyboardShortcuts({ onUndo: handleUndo, onRedo: handleRedo, onEscape, onEnter });

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
      {(hasUnsavedChanges || isSaving) && (
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
      <ConnectionTargetsProvider value={connectionTargetIds}>
        <CanvasShell<ClassicCanvasNode>
          nodes={visible.nodes}
          edges={visible.edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodesDelete={onNodesDelete}
          deleteKeyCode={
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
          nodesConnectable={!isSaving}
          edgesReconnectable={!isSaving}
          connectionLineStyle={{ stroke: euiTheme.colors.primary, strokeWidth: 1 }}
          onNodeClick={onNodeClick}
          onNodeContextMenu={onNodeContextMenu}
          onPaneContextMenu={onPaneContextMenu}
          onSelectionContextMenu={onSelectionContextMenu}
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
                resolvedIndicesByDestination[flyoutDestination.id]?.map((index) => index.name) ?? []
              }
              indicesStatus={resolvedIndicesStatus}
              indicesError={resolvedIndicesError}
              onClose={closeFlyout}
              isDeleteDisabled={isSaving}
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
            />
          )}
          {isCreateModalOpen && (
            <CreateSourceModal sources={sourcesController} onClose={closeCreateModal} />
          )}
          {isCreateDestinationModalOpen && (
            <CreateDestinationModal
              destinations={destinationsController}
              onClose={closeCreateDestinationModal}
            />
          )}
          {routingFlyout && mode === 'routing' ? <RoutingFlyout edge={routingFlyout} /> : null}
          {processingFlyout ? (
            <ProcessingFlyout key={processingFlyout.ref.sessionId} flyout={processingFlyout} />
          ) : null}
          <EuiScreenReaderOnly>
            <p id={KEYBOARD_INSTRUCTIONS_ID}>
              {i18n.translate('xpack.streams.canvas.keyboardInstructions', {
                defaultMessage:
                  'Use Tab to move between nodes. Use the arrow keys to reposition the focused node. Press Delete to remove a selected source or destination. Press Control or Command plus Z to undo, add Shift to redo. Press Escape to close menus and clear the selection.',
              })}
            </p>
          </EuiScreenReaderOnly>
          <CanvasToolbar
            onUndo={handleUndo}
            onRedo={handleRedo}
            onAddSource={addSource}
            onAddDestination={addDestination}
            canUndo={canUndo && !isSaving}
            canRedo={canRedo && !isSaving}
            canAdd={!isSaving}
          />
          <CanvasContextMenu
            position={contextMenu?.position ?? null}
            target={contextMenu?.target ?? 'pane'}
            onTidyUp={onTidyUp}
            onReopen={reopenContextMenu}
            onClose={closeContextMenu}
          />
        </CanvasShell>
      </ConnectionTargetsProvider>
    </div>
  );
}

const buildConfiguredSourceNode = (source: SourceViewModel, hasConnection: boolean): SourceNode => {
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
      hasConnection,
      title: name,
      subtitle: SOURCE_TYPE_CONFIG_BY_TYPE[source.type].shortLabel,
      iconType: SOURCE_TYPE_ICONS[source.type],
      signals,
    },
  };
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
  if (destination.type === 's3') {
    return {
      id: configuredDestinationNodeId(destination.id),
      type: DESTINATION_NODE_TYPE,
      position: { x: 0, y: 0 },
      deletable: true,
      ariaLabel: hasConnectedSource
        ? i18n.translate('xpack.streams.canvas.configuredDestinationNode.s3AriaLabel', {
            defaultMessage: 'Destination: {name}, {signal}',
            values: { name: destination.name, signal },
          })
        : i18n.translate('xpack.streams.canvas.configuredDestinationNode.s3NoSourceAriaLabel', {
            defaultMessage: 'Destination: {name}, {signal}, no source',
            values: { name: destination.name, signal },
          }),
      data: {
        destinationId: destination.id,
        signals: destination.signals,
        title: destination.name,
        subtitle: !hasConnectedSource ? noSourceLabel : destination.bucket,
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
      signals: destination.signals,
      streamName: destination.index,
      indexCount: targetedIndexNames.length,
      targetedIndexNames,
      title: destination.name,
      subtitle: !hasConnectedSource
        ? noSourceLabel
        : destination.mode === 'auto'
        ? i18n.translate('xpack.streams.canvas.configuredDestinationNode.autoLabel', {
            defaultMessage: 'Auto',
          })
        : destination.index,
    },
  };
};

const buildRoutingNode = (routing: RoutingViewModel): RoutingNode => {
  const name = routing.name || routing.id;
  return {
    id: configuredRoutingNodeId(routing.id),
    type: ROUTING_NODE_TYPE,
    position: { x: 0, y: 0 },
    deletable: false,
    ariaLabel: i18n.translate('xpack.streams.canvas.routingNode.ariaLabel', {
      defaultMessage: 'Routing: {name}, {count, plural, one {# rule} other {# rules}}',
      values: { name, count: routing.rules.length },
    }),
    data: {
      pipelineId: routing.id,
      rules: routing.rules.map((rule) => {
        let label: string;

        if (rule.when) {
          label = i18n.translate('xpack.streams.canvas.routingNode.whenRuleLabel', {
            defaultMessage: 'Condition: {condition}',
            values: {
              condition: rule.when,
            },
          });
        } else if (routing.rules.length === 1) {
          label = i18n.translate('xpack.streams.canvas.routingNode.allDataRuleLabel', {
            defaultMessage: 'All data',
          });
        } else {
          label = i18n.translate('xpack.streams.canvas.routingNode.otherwiseRuleLabel', {
            defaultMessage: 'Otherwise',
          });
        }

        return {
          handleId: routingRuleHandleId(rule.index),
          isCatchAll: rule.when === undefined,
          action: rule.action,
          label,
        };
      }),
    },
  };
};

interface CanvasEditSnapshot {
  unit: Unit;
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
