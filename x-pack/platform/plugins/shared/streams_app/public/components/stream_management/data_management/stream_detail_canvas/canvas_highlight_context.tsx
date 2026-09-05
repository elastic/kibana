/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { EdgeMouseHandler, NodeMouseHandler } from '@xyflow/react';
import { HOVER_LEAVE_GRACE_MS } from './canvas_constants';
import { getActiveFlow, type ConnectedFlow, type HoverTarget } from './connected_flow';
import type { ClassicCanvasEdge, ClassicCanvasNode } from './types';

export type HighlightRole = 'in' | 'out' | 'idle';

const CanvasHighlightContext = createContext<ConnectedFlow | null>(null);

export const CanvasHighlightProvider = CanvasHighlightContext.Provider;

export const useCanvasHighlight = (): ConnectedFlow | null => useContext(CanvasHighlightContext);

export const useHighlightRole = (id: string, kind: 'node' | 'edge'): HighlightRole => {
  const flow = useCanvasHighlight();
  if (!flow) {
    return 'idle';
  }
  const ids = kind === 'node' ? flow.nodeIds : flow.edgeIds;
  return ids.has(id) ? 'in' : 'out';
};

export const useCanvasHighlightState = ({
  nodes,
  edges,
}: {
  nodes: ClassicCanvasNode[];
  edges: ClassicCanvasEdge[];
}): {
  activeFlow: ConnectedFlow | null;
  onNodeMouseEnter: NodeMouseHandler<ClassicCanvasNode>;
  onNodeMouseLeave: NodeMouseHandler<ClassicCanvasNode>;
  onEdgeMouseEnter: EdgeMouseHandler<ClassicCanvasEdge>;
  onEdgeMouseLeave: EdgeMouseHandler<ClassicCanvasEdge>;
} => {
  const [hovered, setHovered] = useState<HoverTarget | null>(null);
  const leaveTimerRef = useRef<number | undefined>(undefined);

  const clearLeaveTimer = useCallback(() => {
    if (leaveTimerRef.current !== undefined) {
      window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = undefined;
    }
  }, []);

  const enter = useCallback(
    (target: HoverTarget) => {
      clearLeaveTimer();
      setHovered(target);
    },
    [clearLeaveTimer]
  );

  const leave = useCallback(() => {
    clearLeaveTimer();
    leaveTimerRef.current = window.setTimeout(() => {
      setHovered(null);
      leaveTimerRef.current = undefined;
    }, HOVER_LEAVE_GRACE_MS);
  }, [clearLeaveTimer]);

  useEffect(() => () => clearLeaveTimer(), [clearLeaveTimer]);

  const nodeTypeById = useMemo(() => {
    const map = new Map<string, string | undefined>();
    for (const node of nodes) {
      map.set(node.id, node.type);
    }
    return map;
  }, [nodes]);

  const selectedIds = useMemo(
    () => nodes.filter((node) => node.selected).map((node) => node.id),
    [nodes]
  );

  const activeFlow = useMemo(
    () => getActiveFlow({ hovered, selectedIds, edges, nodeTypeById }),
    [hovered, selectedIds, edges, nodeTypeById]
  );

  const onNodeMouseEnter = useCallback<NodeMouseHandler<ClassicCanvasNode>>(
    (_event, node) => enter({ kind: 'node', id: node.id }),
    [enter]
  );

  const onNodeMouseLeave = useCallback<NodeMouseHandler<ClassicCanvasNode>>(() => {
    leave();
  }, [leave]);

  const onEdgeMouseEnter = useCallback<EdgeMouseHandler<ClassicCanvasEdge>>(
    (_event, edge) => enter({ kind: 'edge', id: edge.id }),
    [enter]
  );

  const onEdgeMouseLeave = useCallback<EdgeMouseHandler<ClassicCanvasEdge>>(() => {
    leave();
  }, [leave]);

  return {
    activeFlow,
    onNodeMouseEnter,
    onNodeMouseLeave,
    onEdgeMouseEnter,
    onEdgeMouseLeave,
  };
};
