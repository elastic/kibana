/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiLoadingSpinner,
  EuiProgress,
  EuiScreenReaderOnly,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Streams } from '@kbn/streams-schema';
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
import { MockStreamCanvas } from './placeholder_stream_canvas';
import { useCanvasKeyboardShortcuts } from './use_canvas_a11y';
import { useCanvasHistory } from './use_canvas_history';
import type { ClassicCanvasNode } from './types';

const KEYBOARD_INSTRUCTIONS_ID = 'streamsCanvasKbdInstructions';

interface CanvasContextMenuState {
  position: ContextMenuPosition;
  target: CanvasContextMenuTarget;
}

interface StreamDetailCanvasProps {
  definition: Streams.ingest.all.GetResponse;
}

/**
 * For classic streams the canvas renders every classic stream as an inferred
 * source -> destination pair, so the content is the same regardless of which
 * classic stream's tab is open. Wired (and any other) streams keep the mock
 * canvas until their topology is wired to real data.
 */
export function StreamDetailCanvas({ definition }: StreamDetailCanvasProps) {
  if (Streams.ClassicStream.GetResponse.is(definition)) {
    return <ClassicStreamsCanvas />;
  }

  return <MockStreamCanvas streamName={definition.stream.name} />;
}

function ClassicStreamsCanvas() {
  const { euiTheme } = useEuiTheme();
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const { value, loading } = useStreamsAppFetch(
    ({ signal }) => streamsRepositoryClient.fetch('GET /internal/streams/classic', { signal }),
    [streamsRepositoryClient]
  );

  const graph = useMemo(() => buildClassicStreamsGraph(value?.streams ?? []), [value]);

  // Local (non-persisted) node state so nodes can be dragged around the canvas.
  // Positions reset to the inferred layout whenever the fetched streams change.
  const [nodes, setNodes, applyNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);

  const { record, undo, redo, reset, canUndo, canRedo } = useCanvasHistory({
    nodes,
    edges,
    setNodes,
    setEdges,
  });

  useEffect(() => {
    setNodes(graph.nodes);
    setEdges(graph.edges);
    // The old positions no longer apply once the streams change.
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
      applyNodesChange(changes);
    },
    [applyNodesChange, record]
  );

  const [contextMenu, setContextMenu] = useState<CanvasContextMenuState | null>(null);

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

  useCanvasKeyboardShortcuts({ onUndo: handleUndo, onRedo: handleRedo, onEscape });

  if (loading && !value) {
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

  if (graph.nodes.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="graphApp"
        data-test-subj="streamsCanvasEmptyPrompt"
        title={
          <h2>
            {i18n.translate('xpack.streams.canvas.noClassicStreamsTitle', {
              defaultMessage: 'No classic streams',
            })}
          </h2>
        }
        body={
          <p>
            {i18n.translate('xpack.streams.canvas.noClassicStreamsBody', {
              defaultMessage: 'Classic streams appear here as source to destination flows.',
            })}
          </p>
        }
      />
    );
  }

  return (
    <CanvasShell<ClassicCanvasNode>
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
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
      <EuiScreenReaderOnly>
        <p id={KEYBOARD_INSTRUCTIONS_ID}>
          {i18n.translate('xpack.streams.canvas.keyboardInstructions', {
            defaultMessage:
              'Use Tab to move between nodes. Use the arrow keys to reposition the focused node. Press Control or Command plus Z to undo, add Shift to redo. Press Escape to close menus and clear the selection.',
          })}
        </p>
      </EuiScreenReaderOnly>
      <CanvasToolbar onUndo={handleUndo} onRedo={handleRedo} canUndo={canUndo} canRedo={canRedo} />
      <CanvasContextMenu
        position={contextMenu?.position ?? null}
        target={contextMenu?.target ?? 'pane'}
        onTidyUp={onTidyUp}
        onReopen={reopenContextMenu}
        onClose={closeContextMenu}
      />
    </CanvasShell>
  );
}
