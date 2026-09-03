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
  type NodeChange,
  type NodeMouseHandler,
} from '@xyflow/react';
import { useKibana } from '../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';
import { buildClassicStreamsGraph } from './build_graph';
import {
  CanvasContextMenu,
  type CanvasContextMenuTarget,
  type ContextMenuPosition,
} from './canvas_context_menu';
import { CanvasShell, getCanvasContainerStyles } from './canvas_shell';
import { CanvasToolbar } from './canvas_toolbar';
import { applyLayout } from './layout';
import { useCanvasKeyboardShortcuts } from './use_canvas_a11y';
import { useCanvasHistory } from './use_canvas_history';
import { StreamFlyout, type StreamFlyoutTabId } from '../../../stream_flyout';
import {
  DESTINATION_NODE_TYPE,
  SOURCE_NODE_TYPE,
  type ClassicCanvasGraph,
  type ClassicCanvasNode,
  type SourceNode,
} from './types';
import { useKbnUrlStateStorageFromRouterContext } from '../../../../util/kbn_url_state_context';
import {
  CanvasStateContextProvider,
  useCanvasEvents,
  useCanvasHasUnsavedChanges,
  useCanvasIsInitializing,
  useCanvasIsSaving,
  useCanvasIsUnitUnavailable,
  useCanvasNodePositions,
  useCanvasSourcesRef,
  useCanvasUrlRef,
} from './state_management';
import {
  useSourceApiKeyGenerationDeps,
  useSourceEnvironmentLoader,
  useSources,
} from '../../../streams_layout/sources/sources_context';
import type { SourceType, SourceViewModel } from '../../../streams_layout/sources/types';
import { SOURCE_TYPE_CONFIG_BY_TYPE } from '../../../streams_layout/sources/source_type_config';
import { CreateSourceModal } from '../../../streams_layout/sources/create_source_modal';
import { SourceDetailsFlyout } from '../../../streams_layout/sources/source_details_flyout';

const KEYBOARD_INSTRUCTIONS_ID = 'streamsCanvasKbdInstructions';
const SOURCE_TYPE_ICONS: Record<SourceType, IconType> = {
  async_bulk: 'logoElasticsearch',
  bulk: 'logoElasticsearch',
  otlp: 'logoObservability',
  es_otlp: 'logoObservability',
  prometheus_remote_write: 'logoPrometheus',
  es_prometheus_remote_write: 'logoPrometheus',
};

const getGraphNodeIds = (graphNodes: Array<{ id: string }>): string =>
  graphNodes.map((node) => node.id).join('\0');

interface CanvasContextMenuState {
  position: ContextMenuPosition;
  target: CanvasContextMenuTarget;
}

/**
 * Renders every classic stream as an inferred source -> destination pair. Wired
 * streams are not represented yet and will join the graph once their topology is
 * wired to real data.
 */
export function StreamsCanvas() {
  const { core } = useKibana();
  const urlStateStorageContainer = useKbnUrlStateStorageFromRouterContext();
  const apiKeyGenerationDeps = useSourceApiKeyGenerationDeps();
  const loadSourceEnvironment = useSourceEnvironmentLoader();

  return (
    <CanvasStateContextProvider
      core={core}
      urlStateStorageContainer={urlStateStorageContainer}
      apiKeyGenerationDeps={apiKeyGenerationDeps}
      loadSourceEnvironment={loadSourceEnvironment}
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
  const { flyoutName } = useCanvasUrlRef();
  const { openFlyout, closeFlyout, selectTab, updateNodePositions, saveUnit } = useCanvasEvents();
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
  const isSourceEnvironmentLoading = useSelector(sourcesActorRef, (state) =>
    state.matches({ environment: 'loading' })
  );
  const hasReceivedUnit = useSelector(sourcesActorRef, (state) => state.context.hasReceivedUnit);
  const sourcesController = useSources({ sourcesActorRef });
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

  const { value, loading } = useStreamsAppFetch(
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
    const configuredSourceNodes = sources.map(buildConfiguredSourceNode);
    const unconfiguredSourceNodes = unconfiguredNodeIds.map(buildUnconfiguredSourceNode);
    const graphNodes = [
      ...configuredSourceNodes,
      ...unconfiguredSourceNodes,
      ...nextGraph.nodes.map(
        (node): ClassicCanvasNode =>
          node.type === DESTINATION_NODE_TYPE
            ? {
                ...node,
                data: {
                  ...node.data,
                  onProcessingClick: (streamName: string) =>
                    openFlyoutTab(streamName, 'processing'),
                },
              }
            : node
      ),
    ];
    return {
      ...nextGraph,
      nodes: applyLayout(graphNodes, nextGraph.edges),
    };
  }, [openFlyoutTab, sources, unconfiguredNodeIds, value]);

  // Local (non-persisted) node state so nodes can be dragged around the canvas.
  // Positions and undo history reset only when the set of node ids changes
  // (streams or configured sources added/removed). Metadata-only updates must
  // not wipe a user's in-progress tidy or keyboard move.
  const [nodes, setNodes, applyNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);
  const [contextMenu, setContextMenu] = useState<CanvasContextMenuState | null>(null);
  const { record, undo, redo, reset, canUndo, canRedo } = useCanvasHistory({
    nodes,
    edges,
    setNodes,
    setEdges,
  });
  const graphNodeIdsRef = useRef('');

  useEffect(() => {
    const nextNodeIds = getGraphNodeIds(graph.nodes);
    if (graphNodeIdsRef.current === nextNodeIds) {
      return;
    }
    graphNodeIdsRef.current = nextNodeIds;

    setNodes(
      graph.nodes.map((node) => {
        const storedPosition = nodePositionsRef.current[node.id];
        return storedPosition ? { ...node, position: storedPosition } : node;
      })
    );
    setEdges(graph.edges);
    reset();
  }, [graph, setNodes, setEdges, reset]);

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

  const onNodeClick = useCallback<NodeMouseHandler<ClassicCanvasNode>>(
    (event, node) => {
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
      if (node.type === 'destination' && !event.shiftKey) {
        event.preventDefault();
        openFlyoutTab(node.data.streamName);
      }
    },
    [openCreateModal, openFlyoutTab, openSourceFlyout]
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
    if (!canUndo) {
      return;
    }
    undo();
  }, [canUndo, undo]);

  const handleRedo = useCallback(() => {
    if (!canRedo) {
      return;
    }
    redo();
  }, [canRedo, redo]);

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
      if (selectedNode.type === 'destination') {
        openFlyoutTab(selectedNode.data.streamName);
      }
    }
  }, [nodes, openCreateModal, openFlyoutTab, openSourceFlyout]);

  useCanvasKeyboardShortcuts({ onUndo: handleUndo, onRedo: handleRedo, onEscape, onEnter });

  // Hold the spinner until classic streams, the unit, the source environment,
  // and the first unit.loaded sync have all settled. Otherwise the graph
  // remounts mid-interaction and undo history is wiped.
  if (
    (loading && !value) ||
    isInitializing ||
    isSourceEnvironmentLoading ||
    (!hasReceivedUnit && !isUnitUnavailable)
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
      <CanvasShell<ClassicCanvasNode>
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
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
        {flyoutName && <StreamFlyout name={flyoutName} onClose={closeFlyout} />}
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
        <EuiScreenReaderOnly>
          <p id={KEYBOARD_INSTRUCTIONS_ID}>
            {i18n.translate('xpack.streams.canvas.keyboardInstructions', {
              defaultMessage:
                'Use Tab to move between nodes. Use the arrow keys to reposition the focused node. Press Control or Command plus Z to undo, add Shift to redo. Press Escape to close menus and clear the selection.',
            })}
          </p>
        </EuiScreenReaderOnly>
        <CanvasToolbar
          onUndo={handleUndo}
          onRedo={handleRedo}
          onAddSource={openCreateModal}
          canUndo={canUndo}
          canRedo={canRedo}
        />
        <CanvasContextMenu
          position={contextMenu?.position ?? null}
          target={contextMenu?.target ?? 'pane'}
          onTidyUp={onTidyUp}
          onReopen={reopenContextMenu}
          onClose={closeContextMenu}
        />
      </CanvasShell>
    </div>
  );
}

const buildConfiguredSourceNode = (source: SourceViewModel): SourceNode => ({
  id: `configured-source-${source.id}`,
  type: SOURCE_NODE_TYPE,
  position: { x: 0, y: 0 },
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

const buildUnconfiguredSourceNode = (nodeId: string): SourceNode => ({
  id: nodeId,
  type: SOURCE_NODE_TYPE,
  position: { x: 0, y: 0 },
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
