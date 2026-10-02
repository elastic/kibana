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
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';
import { buildClassicStreamsGraph } from './build_graph';
import {
  buildUnitConnectionEdges,
  configuredDestinationNodeId,
  configuredSourceNodeId,
  readConfiguredDestinationId,
  readConfiguredSourceId,
} from './build_unit_connection_edges';
import {
  CanvasContextMenu,
  type CanvasContextMenuTarget,
  type ContextMenuPosition,
} from './canvas_context_menu';
import { CanvasEmptyState } from './canvas_empty_state';
import { CanvasShell, getCanvasContainerStyles } from './canvas_shell';
import { ConnectionTargetsProvider } from './nodes/connection_handle';
import { CanvasToolbar } from './canvas_toolbar';
import { applyLayout } from './layout';
import { getGraphNodeIds, syncCanvasNodeMetadata } from './sync_graph_nodes';
import { useCanvasKeyboardShortcuts } from './use_canvas_a11y';
import { useCanvasHistory } from './use_canvas_history';
import { StreamFlyout, type StreamFlyoutTabId } from '../../../stream_flyout';
import {
  DESTINATION_NODE_TYPE,
  SOURCE_NODE_TYPE,
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
  useCanvasIsUnitUnavailable,
  useCanvasNodePositions,
  useCanvasUnitDefinition,
  useCanvasDestinationsRef,
  useCanvasSourcesRef,
  useCanvasUrlRef,
} from './state_management';
import {
  useSourceApiKeyGenerationDeps,
  useSourceEnvironmentLoader,
  useSources,
} from '../../../streams_layout/sources/sources_context';
import { createUnitRepository, type Unit } from '../../../../services/unit_repository';
import type { SourceType, SourceViewModel } from '../../../streams_layout/sources/types';
import { SOURCE_TYPE_CONFIG_BY_TYPE } from '../../../streams_layout/sources/source_type_config';
import { getUnitSources, withUnitSources } from '../../../streams_layout/sources/source_models';
import { CreateSourceModal } from '../../../streams_layout/sources/create_source_modal';
import { SourceDetailsFlyout } from '../../../streams_layout/sources/source_details_flyout';
import { useDestinations } from '../../../streams_layout/destinations/destinations_context';
import { CreateDestinationModal } from '../../../streams_layout/destinations/create_destination_modal';
import { UnitDestinationFlyout } from '../../../streams_layout/destinations/unit_destination_flyout';
import type { DestinationViewModel } from '../../../streams_layout/destinations/types';
import {
  getUnitDestinations,
  withUnitDestinations,
} from '../../../streams_layout/destinations/destination_models';
import {
  canConnectSourceToDestination,
  connectSourceToDestination,
  disconnectSourceFromDestination,
  moveUnitConnection,
  removeComponentFromPipelines,
} from '../../../../services/unit_connections';

const KEYBOARD_INSTRUCTIONS_ID = 'streamsCanvasKbdInstructions';
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
 * Renders classic streams as inferred source -> destination pairs, plus unit
 * sources and destinations wired by each source pipeline.
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
    () => createUnitRepository({ streamsRepositoryClient }),
    [streamsRepositoryClient]
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
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const { flyoutName, flyoutTab } = useCanvasUrlRef();
  const {
    openFlyout,
    closeFlyout,
    selectTab,
    updateNodePositions,
    saveUnit,
    changeUnitConnection,
  } = useCanvasEvents();
  const unitDefinition = useCanvasUnitDefinition();
  const hasUnsavedChanges = useCanvasHasUnsavedChanges();
  const isSaving = useCanvasIsSaving();
  const isInitializing = useCanvasIsInitializing();
  const isUnitUnavailable = useCanvasIsUnitUnavailable();
  const nodePositions = useCanvasNodePositions();
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
    unconfiguredNodeIds,
    openCreateModal,
    closeCreateModal,
    openSourceFlyout,
    closeSourceFlyout,
  } = sourcesController;
  const {
    destinations,
    isCreateModalOpen: isCreateDestinationModalOpen,
    unconfiguredNodeIds: unconfiguredDestinationNodeIds,
    openCreateModal: openCreateDestinationModal,
    closeCreateModal: closeCreateDestinationModal,
  } = destinationsController;
  const { value, loading, refresh } = useStreamsAppFetch(
    ({ signal }) => streamsRepositoryClient.fetch('GET /internal/streams/classic', { signal }),
    [streamsRepositoryClient]
  );

  const openFlyoutTab = useCallback(
    (name: string, initialTab: StreamFlyoutTabId = 'overview') => {
      openFlyout(name);
      selectTab(initialTab);
    },
    [openFlyout, selectTab]
  );

  const graph = useMemo<ClassicCanvasGraph>(() => {
    const nextGraph = buildClassicStreamsGraph(value?.streams ?? []);
    const unitConnectionEdges = buildUnitConnectionEdges(
      unitDefinition,
      sources.map((source) => source.id),
      destinations.map((destination) => destination.id)
    );
    const connectedDestinationIds = new Set(
      unitConnectionEdges.flatMap((edge) => {
        const destinationId = readConfiguredDestinationId(edge.target);
        return destinationId ? [destinationId] : [];
      })
    );
    const configuredSourceNodes = sources.map(buildConfiguredSourceNode);
    const unconfiguredSourceNodes = unconfiguredNodeIds.map(buildUnconfiguredSourceNode);
    const configuredDestinationNodes = destinations.map((destination) =>
      buildConfiguredDestinationNode(destination, connectedDestinationIds.has(destination.id))
    );
    const unconfiguredDestinationNodes = unconfiguredDestinationNodeIds.map(
      buildUnconfiguredDestinationNode
    );
    const edges = [...nextGraph.edges, ...unitConnectionEdges];
    const graphNodes = [
      ...configuredSourceNodes,
      ...unconfiguredSourceNodes,
      ...configuredDestinationNodes,
      ...unconfiguredDestinationNodes,
      ...nextGraph.nodes.map((node): ClassicCanvasNode =>
        node.type === DESTINATION_NODE_TYPE
          ? {
              ...node,
              deletable: false,
              data: {
                ...node.data,
                onProcessingClick: (streamName: string) => openFlyoutTab(streamName, 'processing'),
              },
            }
          : { ...node, deletable: false }
      ),
    ];
    return {
      ...nextGraph,
      nodes: applyLayout(graphNodes, edges),
      edges,
    };
  }, [
    destinations,
    openFlyoutTab,
    sources,
    unconfiguredDestinationNodeIds,
    unconfiguredNodeIds,
    unitDefinition,
    value,
  ]);

  // Local (non-persisted) node state so nodes can be dragged around the canvas.
  // Metadata-only updates (e.g. hasProcessing after a save) are merged onto the
  // live nodes so a user's in-progress tidy or keyboard move is not wiped.
  // Undo history resets when the classic stream set changes, not when a unit
  // node is added or removed, so a deleted unit node can be restored.
  const [nodes, setNodes, applyNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);
  const [contextMenu, setContextMenu] = useState<CanvasContextMenuState | null>(null);
  const restoreHistory = useCallback(
    (extra: CanvasEditSnapshot) => {
      if (extra.unit !== unitDefinition) {
        changeUnitConnection(extra.unit);
      }
      if (!sameIds(extra.unconfiguredSourceNodeIds, unconfiguredNodeIds)) {
        sourcesActorRef.send({
          type: 'unconfiguredNodes.set',
          nodeIds: extra.unconfiguredSourceNodeIds,
        });
      }
      if (!sameIds(extra.unconfiguredDestinationNodeIds, unconfiguredDestinationNodeIds)) {
        destinationsActorRef.send({
          type: 'unconfiguredNodes.set',
          nodeIds: extra.unconfiguredDestinationNodeIds,
        });
      }
    },
    [
      changeUnitConnection,
      destinationsActorRef,
      sourcesActorRef,
      unconfiguredDestinationNodeIds,
      unconfiguredNodeIds,
      unitDefinition,
    ]
  );
  const { record, hold, commit, discard, undo, redo, reset, canUndo, canRedo } = useCanvasHistory({
    nodes,
    edges,
    extra: {
      unit: unitDefinition,
      unconfiguredSourceNodeIds: unconfiguredNodeIds,
      unconfiguredDestinationNodeIds,
    },
    setNodes,
    setEdges,
    onRestore: restoreHistory,
  });
  // The machine holds this canvas when a create save starts, then commits or
  // discards that step from the persist success and failure transitions.
  useBindCanvasCreateHistory({ hold, commit, discard });
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

  const classicNodeIds = useMemo(
    () => getGraphNodeIds(buildClassicStreamsGraph(value?.streams ?? []).nodes),
    [value]
  );
  useEffect(() => {
    reset();
  }, [classicNodeIds, reset]);

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

  const onConnect = useCallback<OnConnect>(
    (connection) => {
      const sourceId = readConfiguredSourceId(connection.source);
      const destinationId = readConfiguredDestinationId(connection.target);
      if (!sourceId || !destinationId) {
        return;
      }
      record();
      changeUnitConnection(connectSourceToDestination(unitDefinition, sourceId, destinationId));
    },
    [changeUnitConnection, record, unitDefinition]
  );

  const onConnectStart = useCallback<OnConnectStart>(
    (_event, params) => {
      if (params.handleType !== 'source') {
        setConnectionTargetIds(null);
        return;
      }
      const sourceId = readConfiguredSourceId(params.nodeId);
      if (!sourceId) {
        setConnectionTargetIds(null);
        return;
      }
      setConnectionTargetIds(
        new Set(
          destinations
            .map((destination) => destination.id)
            .filter((destinationId) =>
              canConnectSourceToDestination(unitDefinition, sourceId, destinationId)
            )
        )
      );
    },
    [destinations, unitDefinition]
  );

  const clearConnectionTargets = useCallback(() => {
    setConnectionTargetIds(null);
  }, []);

  const isValidConnection = useCallback<IsValidConnection>(
    (connection) => {
      const sourceId = readConfiguredSourceId(connection.source);
      const destinationId = readConfiguredDestinationId(connection.target);
      if (!sourceId || !destinationId) {
        return false;
      }
      return canConnectSourceToDestination(unitDefinition, sourceId, destinationId);
    },
    [unitDefinition]
  );

  const onReconnect = useCallback<OnReconnect>(
    (oldEdge, connection) => {
      const previousSourceId = readConfiguredSourceId(oldEdge.source);
      const previousDestinationId = readConfiguredDestinationId(oldEdge.target);
      const sourceId = readConfiguredSourceId(connection.source);
      const destinationId = readConfiguredDestinationId(connection.target);
      if (!previousSourceId || !previousDestinationId || !sourceId || !destinationId) {
        return;
      }
      record();
      changeUnitConnection(
        moveUnitConnection(unitDefinition, {
          previousSourceId,
          previousDestinationId,
          sourceId,
          destinationId,
        })
      );
    },
    [changeUnitConnection, record, unitDefinition]
  );

  const onReconnectEnd = useCallback<
    NonNullable<React.ComponentProps<typeof CanvasShell>['onReconnectEnd']>
  >(
    (_event, edge, _handleType, connectionState) => {
      // Dropping on a handle keeps or moves the line. Releasing on the canvas unhooks it.
      if (connectionState.toHandle) {
        return;
      }
      const sourceId = readConfiguredSourceId(edge.source);
      const destinationId = readConfiguredDestinationId(edge.target);
      if (!sourceId || !destinationId) {
        return;
      }
      record();
      changeUnitConnection(
        disconnectSourceFromDestination(unitDefinition, sourceId, destinationId)
      );
    },
    [changeUnitConnection, record, unitDefinition]
  );

  const onNodesDelete = useCallback<OnNodesDelete<ClassicCanvasNode>>(
    (deletedNodes) => {
      const removedSourceIds: string[] = [];
      const removedDestinationIds: string[] = [];
      const removedSourcePlaceholders: string[] = [];
      const removedDestinationPlaceholders: string[] = [];
      for (const node of deletedNodes) {
        if (node.data.unconfiguredNodeId) {
          if (node.type === SOURCE_NODE_TYPE) {
            removedSourcePlaceholders.push(node.data.unconfiguredNodeId);
          } else {
            removedDestinationPlaceholders.push(node.data.unconfiguredNodeId);
          }
          continue;
        }
        if (node.type === SOURCE_NODE_TYPE && node.data.sourceId) {
          removedSourceIds.push(node.data.sourceId);
          continue;
        }
        if (node.type === DESTINATION_NODE_TYPE && node.data.destinationId) {
          removedDestinationIds.push(node.data.destinationId);
        }
      }
      if (
        removedSourceIds.length === 0 &&
        removedDestinationIds.length === 0 &&
        removedSourcePlaceholders.length === 0 &&
        removedDestinationPlaceholders.length === 0
      ) {
        return;
      }
      record();
      for (const nodeId of removedSourcePlaceholders) {
        sourcesActorRef.send({ type: 'unconfiguredNode.remove', nodeId });
      }
      for (const nodeId of removedDestinationPlaceholders) {
        destinationsActorRef.send({ type: 'unconfiguredNode.remove', nodeId });
      }
      if (removedSourceIds.length > 0 || removedDestinationIds.length > 0) {
        changeUnitConnection(
          withoutDeletedComponents(unitDefinition, removedSourceIds, removedDestinationIds)
        );
      }
      if (flyoutName && removedDestinationIds.includes(flyoutName)) {
        closeFlyout();
      }
    },
    [
      changeUnitConnection,
      closeFlyout,
      destinationsActorRef,
      flyoutName,
      record,
      sourcesActorRef,
      unitDefinition,
    ]
  );

  const onNodeClick = useCallback<NodeMouseHandler<ClassicCanvasNode>>(
    (event, node) => {
      if (event.target instanceof Element && event.target.closest('.react-flow__handle')) {
        return;
      }
      if (node.type === SOURCE_NODE_TYPE && node.data.sourceId && !event.shiftKey) {
        event.preventDefault();
        openSourceFlyout(node.data.sourceId);
        return;
      }
      if (node.type === SOURCE_NODE_TYPE && node.data.unconfiguredNodeId && !event.shiftKey) {
        event.preventDefault();
        openCreateModal(node.data.unconfiguredNodeId);
        return;
      }
      if (node.type === DESTINATION_NODE_TYPE && node.data.destinationId && !event.shiftKey) {
        event.preventDefault();
        openFlyoutTab(node.data.destinationId);
        return;
      }
      if (node.type === DESTINATION_NODE_TYPE && node.data.unconfiguredNodeId && !event.shiftKey) {
        event.preventDefault();
        openCreateDestinationModal(node.data.unconfiguredNodeId);
        return;
      }
      if (node.type === DESTINATION_NODE_TYPE && node.data.streamName && !event.shiftKey) {
        event.preventDefault();
        openFlyoutTab(node.data.streamName);
      }
    },
    [openCreateDestinationModal, openCreateModal, openFlyoutTab, openSourceFlyout]
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

  // Each new placeholder is its own undo step. Reopening the create modal does not add one.
  const addUnconfiguredSource = useCallback(() => {
    if (!isCreateModalOpen) {
      record();
    }
    openCreateModal();
  }, [isCreateModalOpen, openCreateModal, record]);

  const addUnconfiguredDestination = useCallback(() => {
    if (!isCreateDestinationModalOpen) {
      record();
    }
    openCreateDestinationModal();
  }, [isCreateDestinationModalOpen, openCreateDestinationModal, record]);

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
      if (selectedNode.type === SOURCE_NODE_TYPE && selectedNode.data.sourceId) {
        openSourceFlyout(selectedNode.data.sourceId);
      }
      if (selectedNode.type === SOURCE_NODE_TYPE && selectedNode.data.unconfiguredNodeId) {
        openCreateModal(selectedNode.data.unconfiguredNodeId);
      }
      if (selectedNode.type === DESTINATION_NODE_TYPE && selectedNode.data.destinationId) {
        openFlyoutTab(selectedNode.data.destinationId);
      }
      if (selectedNode.type === DESTINATION_NODE_TYPE && selectedNode.data.unconfiguredNodeId) {
        openCreateDestinationModal(selectedNode.data.unconfiguredNodeId);
      }
      if (
        selectedNode.type === DESTINATION_NODE_TYPE &&
        selectedNode.data.streamName &&
        !selectedNode.data.destinationId
      ) {
        openFlyoutTab(selectedNode.data.streamName);
      }
    }
  }, [nodes, openCreateDestinationModal, openCreateModal, openFlyoutTab, openSourceFlyout]);

  useCanvasKeyboardShortcuts({ onUndo: handleUndo, onRedo: handleRedo, onEscape, onEnter });

  // Hold the spinner until classic streams, the unit, the source environment,
  // and the first unit.loaded sync have all settled. Otherwise the graph
  // remounts mid-interaction and undo history is wiped.
  if (
    (loading && !value) ||
    isInitializing ||
    isSourceEnvironmentLoading ||
    ((!hasReceivedUnit || !hasReceivedDestinationsUnit) && !isUnitUnavailable)
  ) {
    return (
      <EuiFlexGroup
        justifyContent="center"
        alignItems="center"
        css={getCanvasContainerStyles(euiTheme)}
      >
        <EuiLoadingSpinner size="xl" data-test-subj="streamsCanvasLoading" />
      </EuiFlexGroup>
    );
  }

  const flyoutDestination = flyoutName
    ? destinations.find((destination) => destination.id === flyoutName)
    : undefined;
  const flyoutStreamName = flyoutDestination?.index ?? flyoutName;

  return (
    <div
      css={css`
        display: flex;
        flex: 1 1 auto;
        min-height: 0;
        width: 100%;
        flex-direction: column;
      `}
    >
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
          nodes={nodes}
          edges={edges}
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
            defaultMessage: 'Streams canvas',
          })}
          ariaDescribedById={KEYBOARD_INSTRUCTIONS_ID}
        >
          {loading && (
            <EuiProgress
              size="xs"
              color="primary"
              position="absolute"
              data-test-subj="streamsCanvasRefreshing"
              aria-label={i18n.translate('xpack.streams.canvas.refreshingLabel', {
                defaultMessage: 'Refreshing streams',
              })}
            />
          )}
          {nodes.length === 0 && <CanvasEmptyState />}
          {flyoutDestination ? (
            <UnitDestinationFlyout
              destinationName={flyoutDestination.name}
              onClose={closeFlyout}
              isDeleteDisabled={isSaving}
              onDelete={() => {
                destinationsController.deleteDestination(flyoutDestination.id);
                closeFlyout();
              }}
            />
          ) : (
            flyoutName &&
            flyoutStreamName && (
              <StreamFlyout
                name={flyoutStreamName}
                onClose={closeFlyout}
                refreshStreams={refresh}
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
            onAddSource={addUnconfiguredSource}
            onAddDestination={addUnconfiguredDestination}
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

const buildConfiguredSourceNode = (source: SourceViewModel): SourceNode => ({
  id: configuredSourceNodeId(source.id),
  type: SOURCE_NODE_TYPE,
  position: { x: 0, y: 0 },
  deletable: true,
  ariaLabel: i18n.translate('xpack.streams.canvas.configuredSourceNode.ariaLabel', {
    defaultMessage: 'Source: {name}, {type}',
    values: { name: source.name ?? source.id, type: SOURCE_TYPE_CONFIG_BY_TYPE[source.type].label },
  }),
  data: {
    sourceId: source.id,
    title: source.name ?? source.id,
    subtitle: SOURCE_TYPE_CONFIG_BY_TYPE[source.type].shortLabel,
    iconType: SOURCE_TYPE_ICONS[source.type],
  },
});

const buildConfiguredDestinationNode = (
  destination: DestinationViewModel,
  hasConnectedSource: boolean
): DestinationNode => ({
  id: configuredDestinationNodeId(destination.id),
  type: DESTINATION_NODE_TYPE,
  position: { x: 0, y: 0 },
  deletable: true,
  ariaLabel: hasConnectedSource
    ? i18n.translate('xpack.streams.canvas.configuredDestinationNode.ariaLabel', {
        defaultMessage: 'Destination: {name}',
        values: { name: destination.name },
      })
    : i18n.translate('xpack.streams.canvas.configuredDestinationNode.noSourceAriaLabel', {
        defaultMessage: 'Destination: {name}, no source',
        values: { name: destination.name },
      }),
  data: {
    destinationId: destination.id,
    streamName: destination.index,
    title: destination.name,
    subtitle: hasConnectedSource
      ? undefined
      : i18n.translate('xpack.streams.canvas.configuredDestinationNode.noSourceLabel', {
          defaultMessage: 'No source',
        }),
  },
});

const buildUnconfiguredDestinationNode = (nodeId: string): DestinationNode => ({
  id: nodeId,
  type: DESTINATION_NODE_TYPE,
  position: { x: 0, y: 0 },
  deletable: true,
  ariaLabel: i18n.translate('xpack.streams.canvas.unconfiguredDestinationNode.ariaLabel', {
    defaultMessage: 'New destination. Click to configure.',
  }),
  data: {
    unconfiguredNodeId: nodeId,
    configurationLabel: i18n.translate(
      'xpack.streams.canvas.unconfiguredDestinationNode.configurationLabel',
      { defaultMessage: 'Click to configure' }
    ),
    title: i18n.translate('xpack.streams.canvas.unconfiguredDestinationNode.title', {
      defaultMessage: 'New destination',
    }),
  },
});

const buildUnconfiguredSourceNode = (nodeId: string): SourceNode => ({
  id: nodeId,
  type: SOURCE_NODE_TYPE,
  position: { x: 0, y: 0 },
  deletable: true,
  ariaLabel: i18n.translate('xpack.streams.canvas.unconfiguredSourceNode.ariaLabel', {
    defaultMessage: 'New source. Click to configure.',
  }),
  data: {
    unconfiguredNodeId: nodeId,
    configurationLabel: i18n.translate(
      'xpack.streams.canvas.unconfiguredSourceNode.configurationLabel',
      {
        defaultMessage: 'Click to configure',
      }
    ),
    title: i18n.translate('xpack.streams.canvas.unconfiguredSourceNode.title', {
      defaultMessage: 'New source',
    }),
    subtitle: '---',
  },
});

interface CanvasEditSnapshot {
  unit: Unit;
  unconfiguredSourceNodeIds: string[];
  unconfiguredDestinationNodeIds: string[];
}

const sameIds = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((id, index) => id === right[index]);

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
