/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { createUniformSpatialGrid, type AxisAlignedRect } from './spatial_grid';

export const KI_GRAPH_LABEL_MIN_ZOOM = 0.35;
export const KI_GRAPH_LABEL_MAX_WIDTH = 140;
export const KI_GRAPH_LABEL_CHAR_WIDTH = 6;
export const KI_GRAPH_LABEL_HEIGHT = 14;
export const KI_GRAPH_LABEL_MAX_COUNT = 400;
export const KI_GRAPH_LABEL_LOW_ZOOM_HUBS = 8;
export const KI_GRAPH_LOW_DETAIL_ZOOM = 0.4;
export const KI_GRAPH_LABEL_RECT_PADDING_WORLD = 3;

const LABEL_GAP = 2;

export interface KiGraphLabelPlacementNode {
  id: string;
  title: string;
  degree: number;
  occurrences?: number;
  position: { x: number; y: number };
  size: number;
}

export interface KiGraphLabelPlacementResult {
  readonly normalZoomLabelIds: ReadonlySet<string>;
  readonly lowZoomLabelIds: ReadonlySet<string>;
}

export interface ComputeKiGraphLabelIdsParams {
  nodes: readonly KiGraphLabelPlacementNode[];
  labelHeight: number;
  charWidth: number;
  maxLabels: number;
  maxLabelWidth?: number;
  lowZoomHubCount?: number;
}

const padRect = (rect: AxisAlignedRect, padding: number): AxisAlignedRect => ({
  left: rect.left - padding,
  top: rect.top - padding,
  right: rect.right + padding,
  bottom: rect.bottom + padding,
});

const compareLabelPriority = (
  a: KiGraphLabelPlacementNode,
  b: KiGraphLabelPlacementNode
): number => {
  if (b.degree !== a.degree) {
    return b.degree - a.degree;
  }
  const aOcc = a.occurrences ?? 0;
  const bOcc = b.occurrences ?? 0;
  if (bOcc !== aOcc) {
    return bOcc - aOcc;
  }
  return a.title.localeCompare(b.title);
};

const topHubIds = (
  sortedByPriority: readonly KiGraphLabelPlacementNode[],
  count: number
): ReadonlySet<string> => new Set(sortedByPriority.slice(0, count).map(({ id }) => id));

const labelRectForNode = (
  node: KiGraphLabelPlacementNode,
  labelHeight: number,
  charWidth: number,
  maxLabelWidth: number
): AxisAlignedRect => {
  const centerX = node.position.x + node.size / 2;
  const titleWidth = Math.min(node.title.length * charWidth, maxLabelWidth);
  const labelTop = node.position.y + node.size + LABEL_GAP;
  return padRect(
    {
      left: centerX - titleWidth / 2,
      top: labelTop,
      right: centerX + titleWidth / 2,
      bottom: labelTop + labelHeight,
    },
    KI_GRAPH_LABEL_RECT_PADDING_WORLD
  );
};

const placeLabels = (
  sorted: readonly KiGraphLabelPlacementNode[],
  eligible: (node: KiGraphLabelPlacementNode) => boolean,
  labelHeight: number,
  charWidth: number,
  maxLabels: number,
  maxLabelWidth: number
): ReadonlySet<string> => {
  if (sorted.length === 0) {
    return new Set();
  }

  const cellSize = Math.max(maxLabelWidth, ...sorted.map((node) => node.size));
  const nodeGrid = createUniformSpatialGrid<KiGraphLabelPlacementNode>(cellSize);
  for (const node of sorted) {
    const centerX = node.position.x + node.size / 2;
    const centerY = node.position.y + node.size / 2;
    nodeGrid.insertCircle(centerX, centerY, node.size / 2, node);
  }

  const labelGrid = createUniformSpatialGrid<number>(cellSize);
  const visible = new Set<string>();
  let labelIndex = 0;

  for (const node of sorted) {
    if (visible.size >= maxLabels) {
      break;
    }
    if (!eligible(node)) {
      continue;
    }

    const labelRect = labelRectForNode(node, labelHeight, charWidth, maxLabelWidth);

    let blocked = false;
    labelGrid.forEachRectOverlapping(labelRect, () => {
      blocked = true;
    });
    if (blocked) {
      continue;
    }

    nodeGrid.forEachCircleIntersectingRect(labelRect, (other) => {
      if (other.id === node.id) {
        return;
      }
      blocked = true;
    });
    if (blocked) {
      continue;
    }

    visible.add(node.id);
    labelGrid.insertRect(labelRect, labelIndex);
    labelIndex += 1;
  }

  return visible;
};

export const computeKiGraphLabelIds = ({
  nodes,
  labelHeight,
  charWidth,
  maxLabels,
  maxLabelWidth = KI_GRAPH_LABEL_MAX_WIDTH,
  lowZoomHubCount = KI_GRAPH_LABEL_LOW_ZOOM_HUBS,
}: ComputeKiGraphLabelIdsParams): KiGraphLabelPlacementResult => {
  const sorted = [...nodes].sort(compareLabelPriority);
  const hubIds = topHubIds(sorted, lowZoomHubCount);

  const normalZoomLabelIds = placeLabels(
    sorted,
    () => true,
    labelHeight,
    charWidth,
    maxLabels,
    maxLabelWidth
  );

  const lowZoomLabelIds = placeLabels(
    sorted,
    (node) => hubIds.has(node.id),
    labelHeight,
    charWidth,
    maxLabels,
    maxLabelWidth
  );

  return { normalZoomLabelIds, lowZoomLabelIds };
};

export const useKiGraphLabelPlacement = (
  nodes: readonly KiGraphLabelPlacementNode[]
): KiGraphLabelPlacementResult =>
  useMemo(
    () =>
      computeKiGraphLabelIds({
        nodes,
        labelHeight: KI_GRAPH_LABEL_HEIGHT,
        charWidth: KI_GRAPH_LABEL_CHAR_WIDTH,
        maxLabels: KI_GRAPH_LABEL_MAX_COUNT,
      }),
    [nodes]
  );
