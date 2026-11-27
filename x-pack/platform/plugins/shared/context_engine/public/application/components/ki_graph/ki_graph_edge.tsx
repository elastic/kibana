/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BaseEdge,
  type EdgeProps,
  type InternalNode,
  useInternalNode,
  useStore,
} from '@xyflow/react';
import React, { memo, useMemo } from 'react';
import { useKiGraphUiStore } from './ki_graph_ui_store';
import { KI_GRAPH_LOW_DETAIL_ZOOM } from './use_visible_label_ids';
import type { KiGraphFlowEdge, KiGraphFlowNode } from './use_ki_graph_layout';

const NODE_EDGE_GAP = 2;

const getCenter = (node: InternalNode<KiGraphFlowNode>): { x: number; y: number } => {
  const { x, y } = node.internals.positionAbsolute;
  const { size } = node.data;
  return { x: x + size / 2, y: y + size / 2 };
};

const edgeIsFocusHighlighted = (
  focusId: string | undefined,
  source: string,
  target: string
): boolean => focusId !== undefined && (focusId === source || focusId === target);

/** Straight edge that starts and ends at the node borders, so arrowheads stay visible. */
export const KiGraphEdge = memo(
  ({ id, source, target, style, markerEnd }: EdgeProps<KiGraphFlowEdge>) => {
    const sourceNode = useInternalNode<KiGraphFlowNode>(source);
    const targetNode = useInternalNode<KiGraphFlowNode>(target);
    const isHighlighted = useKiGraphUiStore((state) =>
      edgeIsFocusHighlighted(state.focusId, source, target)
    );
    const isLowDetail = useStore((state) => state.transform[2] < KI_GRAPH_LOW_DETAIL_ZOOM);

    const path = useMemo(() => {
      if (sourceNode === undefined || targetNode === undefined) {
        return '';
      }

      const from = getCenter(sourceNode);
      const to = getCenter(targetNode);
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const distance = Math.hypot(dx, dy);
      if (distance === 0) {
        return '';
      }

      const ux = dx / distance;
      const uy = dy / distance;
      const sourceReach = sourceNode.data.size / 2 + NODE_EDGE_GAP;
      const targetReach = targetNode.data.size / 2 + NODE_EDGE_GAP;
      return `M ${from.x + ux * sourceReach} ${from.y + uy * sourceReach} L ${
        to.x - ux * targetReach
      } ${to.y - uy * targetReach}`;
    }, [sourceNode, targetNode]);

    if (path === '' || sourceNode === undefined || targetNode === undefined) {
      return null;
    }

    const resolvedMarkerEnd = isLowDetail ? undefined : markerEnd;

    return (
      <g
        data-ki-graph-edge="true"
        {...(isHighlighted ? { 'data-ki-graph-highlighted': 'true' } : {})}
      >
        <BaseEdge id={id} path={path} style={style} markerEnd={resolvedMarkerEnd} />
      </g>
    );
  }
);

KiGraphEdge.displayName = 'KiGraphEdge';
