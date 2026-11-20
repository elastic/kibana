/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HandleType, XYPosition } from '@xyflow/react';
import {
  NODE_HEIGHT_BY_TYPE,
  NODE_HEIGHT_ESTIMATE,
  NODE_WIDTH_ESTIMATE,
  ROW_GAP,
} from './canvas_constants';

/**
 * Vertical distance from a node's top edge to the centre of one of its handles,
 * which is where a line attaches. Undefined until the node has been measured.
 * Without a handle id it reads the node's first handle of that type.
 */
export type ReadHandleOffset = (
  nodeId: string,
  type: HandleType,
  handleId?: string | null
) => number | undefined;

interface StraightNode {
  id: string;
  type?: string;
  position: XYPosition;
  measured?: { width?: number; height?: number };
}

interface StraightEdge {
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

/** Clearance (px) kept between two cards of one column, as the layout leaves it. */
const MIN_ROW_CLEARANCE = Math.max(ROW_GAP - NODE_HEIGHT_ESTIMATE, 0);

/** The height the layout reserves for a node of `type` before it is measured. */
export const getEstimatedNodeHeight = (type: string | undefined): number =>
  (type ? NODE_HEIGHT_BY_TYPE[type] : undefined) ?? NODE_HEIGHT_ESTIMATE;

const getNodeHeight = ({ type, measured }: StraightNode): number =>
  measured?.height ?? getEstimatedNodeHeight(type);

const getNodeWidth = ({ measured }: StraightNode): number => measured?.width ?? NODE_WIDTH_ESTIMATE;

interface LineEnds {
  sourceY: number;
  targetY: number;
}

/** Where both ends of a line attach, or undefined when either node is not measured yet. */
const readLineEnds = (
  edge: StraightEdge,
  readY: (nodeId: string) => number | undefined,
  readHandleOffset: ReadHandleOffset
): LineEnds | undefined => {
  const sourceTop = readY(edge.source);
  const targetTop = readY(edge.target);
  const sourceOffset = readHandleOffset(edge.source, 'source', edge.sourceHandle);
  const targetOffset = readHandleOffset(edge.target, 'target', edge.targetHandle);
  if (
    sourceTop === undefined ||
    targetTop === undefined ||
    sourceOffset === undefined ||
    targetOffset === undefined
  ) {
    return undefined;
  }
  return { sourceY: sourceTop + sourceOffset, targetY: targetTop + targetOffset };
};

interface StraightSnapOptions {
  /** The nodes being dragged and where the drag puts them. */
  moved: ReadonlyMap<string, XYPosition>;
  nodes: readonly StraightNode[];
  edges: readonly StraightEdge[];
  readHandleOffset: ReadHandleOffset;
  threshold: number;
}

/**
 * How far to shift the dragged nodes vertically so one of their lines to a node
 * that stays put becomes straight. Picks the line that needs the smallest shift,
 * and returns 0 when none is within `threshold`.
 */
export const getStraightSnapDelta = ({
  moved,
  nodes,
  edges,
  readHandleOffset,
  threshold,
}: StraightSnapOptions): number => {
  const restingY = new Map(nodes.map(({ id, position }) => [id, position.y]));
  const readY = (nodeId: string) => moved.get(nodeId)?.y ?? restingY.get(nodeId);

  let closest = 0;
  let closestDistance = Infinity;
  for (const edge of edges) {
    const isSourceMoved = moved.has(edge.source);
    // A line between two dragged nodes keeps its shape, so it gives no direction.
    if (isSourceMoved === moved.has(edge.target)) {
      continue;
    }
    const ends = readLineEnds(edge, readY, readHandleOffset);
    if (!ends) {
      continue;
    }
    const delta = isSourceMoved ? ends.targetY - ends.sourceY : ends.sourceY - ends.targetY;
    const distance = Math.abs(delta);
    if (distance <= threshold && distance < closestDistance) {
      closest = delta;
      closestDistance = distance;
    }
  }
  return closest;
};

interface StraightenFlowOptions {
  /** When provided, only these nodes are moved. */
  onlyIds?: ReadonlySet<string>;
}

/**
 * Moves each node whose lines all arrive from one handle level with that handle,
 * so the line into it is straight. Walks left to right, so a chain straightens
 * end to end. A node stays where it is when the move would crowd another card
 * in its column, or when either end of the line is not measured yet. Returns
 * `nodes` itself when nothing moves.
 */
export const straightenFlow = <N extends StraightNode>(
  nodes: N[],
  edges: readonly StraightEdge[],
  readHandleOffset: ReadHandleOffset,
  { onlyIds }: StraightenFlowOptions = {}
): N[] => {
  const tops = new Map(nodes.map(({ id, position }) => [id, position.y]));
  const readY = (nodeId: string) => tops.get(nodeId);
  const incomingByTarget = new Map<string, StraightEdge[]>();
  for (const edge of edges) {
    if (tops.has(edge.source) && tops.has(edge.target)) {
      incomingByTarget.set(edge.target, [...(incomingByTarget.get(edge.target) ?? []), edge]);
    }
  }

  const crowdsAnotherCard = (node: N, top: number): boolean => {
    const left = node.position.x;
    const right = left + getNodeWidth(node);
    const bottom = top + getNodeHeight(node);
    return nodes.some((other) => {
      if (other.id === node.id) {
        return false;
      }
      const otherLeft = other.position.x;
      const otherTop = tops.get(other.id) ?? other.position.y;
      return (
        left < otherLeft + getNodeWidth(other) &&
        otherLeft < right &&
        top < otherTop + getNodeHeight(other) + MIN_ROW_CLEARANCE &&
        otherTop < bottom + MIN_ROW_CLEARANCE
      );
    });
  };

  let didMove = false;
  const leftToRight = [...nodes].sort((a, b) => a.position.x - b.position.x);
  for (const node of leftToRight) {
    const incoming = incomingByTarget.get(node.id) ?? [];
    const origins = new Set(incoming.map((edge) => `${edge.source}\0${edge.sourceHandle ?? ''}`));
    if ((onlyIds && !onlyIds.has(node.id)) || origins.size !== 1) {
      continue;
    }
    const ends = readLineEnds(incoming[0], readY, readHandleOffset);
    const currentTop = tops.get(node.id);
    if (!ends || currentTop === undefined || ends.sourceY === ends.targetY) {
      continue;
    }
    const nextTop = currentTop + ends.sourceY - ends.targetY;
    if (crowdsAnotherCard(node, nextTop)) {
      continue;
    }
    tops.set(node.id, nextTop);
    didMove = true;
  }

  if (!didMove) {
    return nodes;
  }
  return nodes.map((node) => {
    const top = tops.get(node.id);
    return top === undefined || top === node.position.y
      ? node
      : { ...node, position: { x: node.position.x, y: top } };
  });
};

/**
 * Moves each node whose measured height differs from `previousHeights` (or, for a
 * node not in it, from the height the layout reserved) by half the difference, so
 * a handle at the middle of the card stays where it was and its lines stay
 * straight. Records the new heights in `previousHeights`. Returns `nodes` itself
 * when nothing moves.
 */
export const keepHandlesOnResize = <N extends StraightNode>(
  nodes: N[],
  previousHeights: Map<string, number>
): N[] => {
  let didMove = false;
  const anchored = nodes.map((node) => {
    const height = node.measured?.height;
    if (height === undefined) {
      return node;
    }
    const previous = previousHeights.get(node.id) ?? getEstimatedNodeHeight(node.type);
    previousHeights.set(node.id, height);
    if (previous === height) {
      return node;
    }
    didMove = true;
    return {
      ...node,
      position: { x: node.position.x, y: node.position.y - (height - previous) / 2 },
    };
  });
  return didMove ? anchored : nodes;
};
