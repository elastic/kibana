/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Selection-related actions and the right-click context-menu state:
//   - selectStream    — select everything a node's flow reaches (directed), as a
//                       real React Flow selection (box + move-together).
//   - cleanupSelected — auto-layout + straighten only the selected sub-graph.
//   - context-menu handlers that open the menu for a selection or a single node.
// Kept out of the canvas orchestrator so the selection feature lives on its own.

import type React from 'react';
import { useCallback, useState } from 'react';
import { useReactFlow, useStoreApi, type Edge, type Node } from '@xyflow/react';
import { computeCleanupLayout, straightenChains } from './auto-layout';
import { flowDirectionFor, reachableFlow } from './connected-flow';

export interface CanvasContextMenu {
  x: number;
  y: number;
  nodeIds: string[];
}

interface SelectionDeps {
  setNodes: (updater: (nodes: Node[]) => Node[]) => void;
  recordHistory: () => void;
}

export function useCanvasSelection({ setNodes, recordHistory }: SelectionDeps) {
  const { getNodes, getEdges } = useReactFlow();
  const store = useStoreApi();
  const [contextMenu, setContextMenu] = useState<CanvasContextMenu | null>(null);

  // Cleanup applied to only the selected nodes: lay them out among themselves,
  // translate so the result keeps the selection's current top-left, then
  // straighten 1:1 chains — one synchronous pass (no timing race).
  const cleanupSelected = useCallback(
    (ids: string[]) => {
      const idSet = new Set(ids);
      const subset = getNodes().filter((n) => idSet.has(n.id) && n.type !== 'routingEndpoint');
      if (subset.length < 2) return;
      recordHistory();
      const subEdges = getEdges().filter((e) => idSet.has(e.source) && idSet.has(e.target));
      const layout = computeCleanupLayout(subset, subEdges);
      const curMinX = Math.min(...subset.map((n) => n.position.x));
      const curMinY = Math.min(...subset.map((n) => n.position.y));
      let layMinX = Infinity;
      let layMinY = Infinity;
      layout.forEach((p) => {
        layMinX = Math.min(layMinX, p.x);
        layMinY = Math.min(layMinY, p.y);
      });
      const dx = curMinX - layMinX;
      const dy = curMinY - layMinY;
      const laidOut = getNodes().map((n) => {
        const p = layout.get(n.id);
        return p ? { ...n, position: { x: p.x + dx, y: p.y + dy } } : n;
      });
      const straight = straightenChains(
        laidOut.filter((n) => idSet.has(n.id)),
        subEdges
      );
      setNodes(() =>
        laidOut.map((n) => {
          const s = straight.get(n.id);
          return s ? { ...n, position: s } : n;
        })
      );
    },
    [getNodes, getEdges, setNodes, recordHistory]
  );

  // "Select stream": select exactly what hovering each element highlights —
  // directed reachability (downstream from a source, upstream from a
  // destination, both for a pipeline/routing node). Works on a single element
  // or an existing multi-selection.
  const selectStream = useCallback(
    (ids: string[]) => {
      const all = getNodes();
      const edges: Edge[] = getEdges();
      const scope = ids.map((id) => all.find((n) => n.id === id)).filter((n): n is Node => !!n);
      if (!scope.length) return;
      const stream = new Set<string>();
      scope.forEach((node) => {
        reachableFlow(node.id, edges, flowDirectionFor(node.type)).nodeIds.forEach((nid) =>
          stream.add(nid)
        );
      });
      // Activate React Flow's nodes-selection so this becomes a real selection
      // (bounding box, move-together, right-click → selection menu) — identical
      // to a marquee selection.
      store.getState().addSelectedNodes([...stream]);
      store.setState({ nodesSelectionActive: true });
    },
    [getNodes, getEdges, store]
  );

  const openContextMenu = useCallback((event: React.MouseEvent, nodeIds: string[]) => {
    event.preventDefault();
    if (!nodeIds.length) return;
    setContextMenu({ x: event.clientX, y: event.clientY, nodeIds });
  }, []);

  // Right-click on the multi-selection overlay → act on the whole selection.
  const onSelectionContextMenu = useCallback(
    (event: React.MouseEvent, selectedNodes: Node[]) => {
      openContextMenu(
        event,
        selectedNodes.map((n) => n.id)
      );
    },
    [openContextMenu]
  );

  // Right-click on a node → act on the current selection if the node is part of
  // it, otherwise just that node.
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      const selected = getNodes()
        .filter((n) => n.selected)
        .map((n) => n.id);
      const ids = selected.includes(node.id) && selected.length > 1 ? selected : [node.id];
      openContextMenu(event, ids);
    },
    [getNodes, openContextMenu]
  );

  return {
    contextMenu,
    setContextMenu,
    selectStream,
    cleanupSelected,
    onSelectionContextMenu,
    onNodeContextMenu,
  };
}
