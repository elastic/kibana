/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { act, renderHook } from '@testing-library/react';
import type { Edge, Node } from '@xyflow/react';
import { useCanvasHistory } from './use_canvas_history';

const initialNodes: Node[] = [{ id: 'a', position: { x: 0, y: 0 }, data: {} }];

// Drives the hook with real node/edge state so undo/redo can observe updates,
// mirroring how the canvas wires `useNodesState`/`useEdgesState` in.
function useHistoryHarness() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>([]);
  const history = useCanvasHistory({ nodes, edges, setNodes, setEdges });
  return { nodes, setNodes, history };
}

const moveFirstNodeTo = (x: number) => (current: Node[]) =>
  current.map((node, index) => (index === 0 ? { ...node, position: { x, y: 0 } } : node));

describe('useCanvasHistory', () => {
  it('starts with nothing to undo or redo', () => {
    const { result } = renderHook(() => useHistoryHarness());
    expect(result.current.history.canUndo).toBe(false);
    expect(result.current.history.canRedo).toBe(false);
  });

  it('undoes and redoes a recorded change', () => {
    const { result } = renderHook(() => useHistoryHarness());

    act(() => result.current.history.record());
    act(() => result.current.setNodes(moveFirstNodeTo(100)));

    expect(result.current.history.canUndo).toBe(true);
    expect(result.current.nodes[0].position.x).toBe(100);

    act(() => result.current.history.undo());
    expect(result.current.nodes[0].position.x).toBe(0);
    expect(result.current.history.canUndo).toBe(false);
    expect(result.current.history.canRedo).toBe(true);

    act(() => result.current.history.redo());
    expect(result.current.nodes[0].position.x).toBe(100);
    expect(result.current.history.canRedo).toBe(false);
  });

  it('clears the redo stack when a new change is recorded', () => {
    const { result } = renderHook(() => useHistoryHarness());

    act(() => result.current.history.record());
    act(() => result.current.setNodes(moveFirstNodeTo(100)));
    act(() => result.current.history.undo());
    expect(result.current.history.canRedo).toBe(true);

    act(() => result.current.history.record());
    expect(result.current.history.canRedo).toBe(false);
  });

  it('reset empties both stacks', () => {
    const { result } = renderHook(() => useHistoryHarness());

    act(() => result.current.history.record());
    act(() => result.current.setNodes(moveFirstNodeTo(100)));
    expect(result.current.history.canUndo).toBe(true);

    act(() => result.current.history.reset());
    expect(result.current.history.canUndo).toBe(false);
    expect(result.current.history.canRedo).toBe(false);
  });

  it('is a no-op to undo or redo when the stacks are empty', () => {
    const { result } = renderHook(() => useHistoryHarness());

    act(() => result.current.history.undo());
    act(() => result.current.history.redo());

    expect(result.current.nodes[0].position.x).toBe(0);
    expect(result.current.history.canUndo).toBe(false);
    expect(result.current.history.canRedo).toBe(false);
  });
});
