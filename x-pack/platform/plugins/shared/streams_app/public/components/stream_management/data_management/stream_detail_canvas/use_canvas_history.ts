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
  /** Remember the current canvas until a later save succeeds or fails. */
  hold: () => void;
  /** Keep the held snapshot as an undo step. */
  commit: () => void;
  /** Drop the held snapshot. */
  discard: () => void;
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
  // pre-update stack and pop the same snapshot twice. Restoring also updates the
  // nodes, and that write can look like a new edit. Hold the lock until this
  // commit's effects have run, then release it so the next real edit is recorded.
  const isApplyingRef = useRef(false);
  // A create is undone only after its save succeeds. Hold the pre-create canvas
  // here, and ignore other history writes until that save settles.
  const heldRef = useRef<Snapshot<NodeType, EdgeType, Extra> | null>(null);

  useEffect(() => {
    isApplyingRef.current = false;
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
    if (isApplyingRef.current || heldRef.current) {
      return;
    }
    setPast((stack) => [...stack, captureSnapshot()].slice(-HISTORY_LIMIT));
    setFuture([]);
  }, [captureSnapshot]);

  const hold = useCallback(() => {
    if (isApplyingRef.current || heldRef.current) {
      return;
    }
    heldRef.current = captureSnapshot();
  }, [captureSnapshot]);

  const commit = useCallback(() => {
    const held = heldRef.current;
    if (!held) {
      return;
    }
    heldRef.current = null;
    setPast((stack) => [...stack, held].slice(-HISTORY_LIMIT));
    setFuture([]);
  }, []);

  const discard = useCallback(() => {
    heldRef.current = null;
  }, []);

  const undo = useCallback(() => {
    const stack = pastRef.current;
    if (isApplyingRef.current || stack.length === 0) {
      return;
    }
    isApplyingRef.current = true;
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
    const next = stack[stack.length - 1];
    setPast([...pastRef.current, captureSnapshot()]);
    setFuture(stack.slice(0, -1));
    setNodes(next.nodes);
    setEdges(next.edges);
    onRestoreRef.current(next.extra);
  }, [captureSnapshot, setNodes, setEdges]);

  const reset = useCallback(() => {
    heldRef.current = null;
    setPast([]);
    setFuture([]);
  }, []);

  return {
    record,
    hold,
    commit,
    discard,
    undo,
    redo,
    reset,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
