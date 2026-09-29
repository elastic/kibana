/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Edge, Node } from '@xyflow/react';

/** Cap the stack so long editing sessions don't grow memory unbounded. */
const HISTORY_LIMIT = 100;

interface Snapshot<NodeType extends Node, EdgeType extends Edge> {
  nodes: NodeType[];
  edges: EdgeType[];
}

interface UseCanvasHistoryArgs<NodeType extends Node, EdgeType extends Edge> {
  nodes: NodeType[];
  edges: EdgeType[];
  setNodes: Dispatch<SetStateAction<NodeType[]>>;
  setEdges: Dispatch<SetStateAction<EdgeType[]>>;
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

export function useCanvasHistory<NodeType extends Node, EdgeType extends Edge>({
  nodes,
  edges,
  setNodes,
  setEdges,
}: UseCanvasHistoryArgs<NodeType, EdgeType>): CanvasHistory {
  const latestRef = useRef<Snapshot<NodeType, EdgeType>>({ nodes, edges });
  latestRef.current = { nodes, edges };

  const [past, setPast] = useState<Array<Snapshot<NodeType, EdgeType>>>([]);
  const [future, setFuture] = useState<Array<Snapshot<NodeType, EdgeType>>>([]);

  const pastRef = useRef(past);
  pastRef.current = past;
  const futureRef = useRef(future);
  futureRef.current = future;

  // The stacks are read from refs but mutated via async setState, so a second
  // undo/redo fired in the same tick (e.g. a key held down) would read the same
  // pre-update stack and pop the same snapshot twice. This lock blocks re-entry
  // until the state update commits and re-renders (which clears it below).
  const isApplyingRef = useRef(false);
  isApplyingRef.current = false;

  const record = useCallback(() => {
    setPast((stack) => [...stack, latestRef.current].slice(-HISTORY_LIMIT));
    setFuture([]);
  }, []);

  const undo = useCallback(() => {
    const stack = pastRef.current;
    if (isApplyingRef.current || stack.length === 0) {
      return;
    }
    isApplyingRef.current = true;
    const previous = stack[stack.length - 1];
    setFuture([...futureRef.current, latestRef.current]);
    setPast(stack.slice(0, -1));
    setNodes(previous.nodes);
    setEdges(previous.edges);
  }, [setNodes, setEdges]);

  const redo = useCallback(() => {
    const stack = futureRef.current;
    if (isApplyingRef.current || stack.length === 0) {
      return;
    }
    isApplyingRef.current = true;
    const next = stack[stack.length - 1];
    setPast([...pastRef.current, latestRef.current]);
    setFuture(stack.slice(0, -1));
    setNodes(next.nodes);
    setEdges(next.edges);
  }, [setNodes, setEdges]);

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
