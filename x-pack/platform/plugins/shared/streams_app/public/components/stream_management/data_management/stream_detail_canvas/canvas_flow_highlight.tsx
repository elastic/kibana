/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ComponentType } from 'react';
import { css } from '@emotion/react';
import { euiCanAnimate } from '@elastic/eui';
import type { NodeMouseHandler } from '@xyflow/react';
import { FLOW_DIMMED_OPACITY, FLOW_HIGHLIGHT_TRANSITION_MS } from './canvas_constants';
import { getConnectedFlow, type ConnectedFlow } from './connected_flow';
import type { ClassicCanvasGraph, ClassicCanvasNode } from './types';

export type FlowHighlightState = 'highlighted' | 'dimmed';

const FlowHighlightContext = createContext<ConnectedFlow | undefined>(undefined);

/** The flow to spotlight. Nodes and edges outside it fade out. */
export const FlowHighlightProvider = FlowHighlightContext.Provider;

export const useHighlightedFlow = (): ConnectedFlow | undefined => useContext(FlowHighlightContext);

/** Where a node or edge stands against the spotlighted flow, or `undefined` when there is none. */
export const useFlowHighlightState = (
  id: string,
  kind: 'node' | 'edge'
): FlowHighlightState | undefined => {
  const flow = useHighlightedFlow();
  if (!flow) {
    return undefined;
  }
  const flowIds = kind === 'node' ? flow.nodeIds : flow.edgeIds;
  return flowIds.has(id) ? 'highlighted' : 'dimmed';
};

export const getFlowDimStyles = (state: FlowHighlightState | undefined) => css`
  opacity: ${state === 'dimmed' ? FLOW_DIMMED_OPACITY : 1};
  ${euiCanAnimate} {
    transition: opacity ${FLOW_HIGHLIGHT_TRANSITION_MS}ms ease;
  }
`;

interface HoveredFlow {
  hoveredFlow: ConnectedFlow | undefined;
  onNodeMouseEnter: NodeMouseHandler<ClassicCanvasNode>;
  onNodeMouseLeave: NodeMouseHandler<ClassicCanvasNode>;
  clearHoveredFlow: () => void;
}

/** Tracks the hovered node and resolves everything upstream and downstream of it. */
export const useHoveredFlow = ({ nodes, edges }: ClassicCanvasGraph): HoveredFlow => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string>();

  const hoveredFlow = useMemo(() => {
    // A node deleted under the pointer never fires a mouse leave.
    if (hoveredNodeId === undefined || !nodes.some(({ id }) => id === hoveredNodeId)) {
      return undefined;
    }
    return getConnectedFlow([hoveredNodeId], edges);
  }, [hoveredNodeId, nodes, edges]);

  const onNodeMouseEnter = useCallback<NodeMouseHandler<ClassicCanvasNode>>((event, node) => {
    // A pressed button means a drag is passing over the node (a line being
    // connected, a marquee), which must not fade its surroundings.
    if (event.buttons === 0) {
      setHoveredNodeId(node.id);
    }
  }, []);

  const clearHoveredFlow = useCallback(() => setHoveredNodeId(undefined), []);

  return { hoveredFlow, onNodeMouseEnter, onNodeMouseLeave: clearHoveredFlow, clearHoveredFlow };
};

/** Fades a node, card and handles alike, while it sits outside the spotlighted flow. */
export const withFlowHighlight = <Props extends { id: string }>(
  NodeComponent: ComponentType<Props>
): ComponentType<Props> => {
  const FlowHighlightedNode = (props: Props) => {
    const state = useFlowHighlightState(props.id, 'node');
    return (
      <div css={getFlowDimStyles(state)} data-flow-highlight={state}>
        <NodeComponent {...props} />
      </div>
    );
  };
  FlowHighlightedNode.displayName = `withFlowHighlight(${
    NodeComponent.displayName ?? NodeComponent.name
  })`;
  return FlowHighlightedNode;
};
