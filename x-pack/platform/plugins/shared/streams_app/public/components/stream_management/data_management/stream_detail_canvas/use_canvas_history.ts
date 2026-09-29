/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Edge, Node } from '@xyflow/react';

/** Cap the stack so long editing sessions don't grow memory unbounded. */
const HISTORY_LIMIT = 50;

interface Snapshot<NodeType extends Node, EdgeType extends Edge, Extra> {
  nodes: NodeType[];
  edges: EdgeType[];
  extra: Extra;
}

interface UseCanvasHistoryArgs<NodeType extends Node, EdgeType extends Edge, Extra> {
  nodes: NodeType[];
  edges: EdgeType[];
  extra: Extra;
  setNodes: Dispatch<SetStateAction<NodeType[]>>;
  setEdges: Dispatch<SetStateAction<EdgeType[]>>;
  onRestore: (extra: Extra) => void;
}

export interface CanvasHistory {
  /** Capture the current state BEFORE a mutating action so it can be undone. */
  record: () => void;
  undo: () => void;
  redo: () => void;
  /** Clear the stacks, e.g. when the underlying data is reloaded. */
  reset: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useCanvasHistory<NodeType extends Node, EdgeType extends Edge, Extra>({
  nodes,
  edges,
  extra,
  setNodes,
  setEdges,
  onRestore,
}: UseCanvasHistoryArgs<NodeType, EdgeType, Extra>): CanvasHistory {
  const latestRef = useRef<Snapshot<NodeType, EdgeType, Extra>>({ nodes, edges, extra });
  latestRef.current = { nodes, edges, extra };
  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;

  const [past, setPast] = useState<Array<Snapshot<NodeType, EdgeType, Extra>>>([]);
  const [future, setFuture] = useState<Array<Snapshot<NodeType, EdgeType, Extra>>>([]);

  const pastRef = useRef(past);
  pastRef.current = past;
  const futureRef = useRef(future);
  futureRef.current = future;

  // The stacks are read from refs but mutated via async setState, so a second
  // undo/redo fired in the same tick (e.g. a key held down) would read the same
  // pre-update stack and pop the same snapshot twice. This lock blocks re-entry
  // until the state update commits.
  const isApplyingRef = useRef(false);
  // Restoring a snapshot updates nodes, then the graph sync writes them again.
  // Those writes look like a new edit and would clear the redo stack. Ignore
  // records for this render and the follow-up one.
  const suppressRecordRef = useRef(0);

  useEffect(() => {
    isApplyingRef.current = false;
    if (suppressRecordRef.current > 0) {
      suppressRecordRef.current -= 1;
    }
  });

  const captureSnapshot = useCallback((): Snapshot<NodeType, EdgeType, Extra> => {
    const current = latestRef.current;
    return {
      nodes: current.nodes.map((node) => ({ ...node, position: { ...node.position } })),
      edges: current.edges.map((edge) => ({ ...edge })),
      extra: current.extra,
    };
  }, []);

  const record = useCallback(() => {
    if (isApplyingRef.current || suppressRecordRef.current > 0) {
      return;
    }
    setPast((stack) => [...stack, captureSnapshot()].slice(-HISTORY_LIMIT));
    setFuture([]);
  }, [captureSnapshot]);

  const undo = useCallback(() => {
    const stack = pastRef.current;
    if (isApplyingRef.current || stack.length === 0) {
      return;
    }
    isApplyingRef.current = true;
    suppressRecordRef.current = 2;
    const previous = stack[stack.length - 1];
    setFuture([...futureRef.current, captureSnapshot()]);
    setPast(stack.slice(0, -1));
    setNodes(previous.nodes);
    setEdges(previous.edges);
    onRestoreRef.current(previous.extra);
  }, [captureSnapshot, setNodes, setEdges]);

  const redo = useCallback(() => {
    const stack = futureRef.current;
    if (isApplyingRef.current || stack.length === 0) {
      return;
    }
    isApplyingRef.current = true;
    suppressRecordRef.current = 2;
    const next = stack[stack.length - 1];
    setPast([...pastRef.current, captureSnapshot()]);
    setFuture(stack.slice(0, -1));
    setNodes(next.nodes);
    setEdges(next.edges);
    onRestoreRef.current(next.extra);
  }, [captureSnapshot, setNodes, setEdges]);

  const reset = useCallback(() => {
    setPast([]);
    setFuture([]);
  }, []);

  return {
    record,
    undo,
    redo,
    reset,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
