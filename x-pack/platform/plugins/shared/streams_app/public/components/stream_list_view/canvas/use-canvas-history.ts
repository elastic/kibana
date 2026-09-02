/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Undo/redo for the canvas. A simple snapshot history: recordHistory() is
// called at the START of each mutating action (drag, connect, splice, delete,
// cleanup, group), capturing the pre-change state so undo can restore it.

import { useCallback, useState } from 'react';
import type { Edge, Node } from '@xyflow/react';

interface HistoryDeps {
  getNodes: () => Node[];
  getEdges: () => Edge[];
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
}

export function useCanvasHistory({ getNodes, getEdges, setNodes, setEdges }: HistoryDeps) {
  const [history, setHistory] = useState<{
    past: Array<{ nodes: Node[]; edges: Edge[] }>;
    future: Array<{ nodes: Node[]; edges: Edge[] }>;
  }>({ past: [], future: [] });

  const recordHistory = useCallback(() => {
    setHistory((h) => ({
      past: [...h.past, { nodes: getNodes(), edges: getEdges() }].slice(-100),
      future: [],
    }));
  }, [getNodes, getEdges]);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (!h.past.length) return h;
      const prev = h.past[h.past.length - 1];
      const current = { nodes: getNodes(), edges: getEdges() };
      setNodes(prev.nodes);
      setEdges(prev.edges);
      return { past: h.past.slice(0, -1), future: [...h.future, current] };
    });
  }, [getNodes, getEdges, setNodes, setEdges]);

  const redo = useCallback(() => {
    setHistory((h) => {
      if (!h.future.length) return h;
      const next = h.future[h.future.length - 1];
      const current = { nodes: getNodes(), edges: getEdges() };
      setNodes(next.nodes);
      setEdges(next.edges);
      return { past: [...h.past, current], future: h.future.slice(0, -1) };
    });
  }, [getNodes, getEdges, setNodes, setEdges]);

  return {
    recordHistory,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
