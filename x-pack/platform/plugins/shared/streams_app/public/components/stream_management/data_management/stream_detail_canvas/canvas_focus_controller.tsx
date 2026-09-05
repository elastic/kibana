/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useNodesInitialized, useReactFlow } from '@xyflow/react';
import { FIT_VIEW_DURATION, FOCUS_FIT_MAX_ZOOM, FOCUS_FIT_PADDING } from './canvas_constants';
import { flowDirectionFor, getConnectedFlow } from './connected_flow';
import type { ClassicCanvasEdge, ClassicCanvasNode } from './types';

/**
 * Consumes a one-shot URL focus request: selects the destination, frames its
 * connected flow, then clears the URL so the viewport is not sticky.
 */
export function CanvasFocusController({
  focusNodeId,
  nodes,
  edges,
  onSelectNode,
  onFocused,
}: {
  focusNodeId: string | null;
  nodes: ClassicCanvasNode[];
  edges: ClassicCanvasEdge[];
  onSelectNode: (nodeId: string) => void;
  onFocused: () => void;
}) {
  const { fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const appliedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!focusNodeId || !nodesInitialized) {
      return;
    }
    if (appliedRef.current === focusNodeId) {
      return;
    }

    const node = nodes.find((item) => item.id === focusNodeId);
    if (!node) {
      appliedRef.current = focusNodeId;
      onFocused();
      return;
    }

    const flow = getConnectedFlow(focusNodeId, edges, flowDirectionFor(node.type));
    const flowNodes = nodes.filter((item) => flow.nodeIds.has(item.id));
    appliedRef.current = focusNodeId;
    onSelectNode(focusNodeId);
    void fitView({
      nodes: flowNodes,
      padding: FOCUS_FIT_PADDING,
      duration: FIT_VIEW_DURATION,
      maxZoom: FOCUS_FIT_MAX_ZOOM,
    });
    onFocused();
  }, [focusNodeId, nodesInitialized, nodes, edges, fitView, onSelectNode, onFocused]);

  return null;
}
