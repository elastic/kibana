/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useStore } from '@xyflow/react';
import { useMemo } from 'react';

export const KI_GRAPH_LABEL_ZOOM_BUCKET = 0.1;
export const KI_GRAPH_LABEL_MIN_ZOOM = 0.35;
export const KI_GRAPH_LABEL_MAX_WIDTH = 140;
export const KI_GRAPH_LABEL_CHAR_WIDTH = 6;
export const KI_GRAPH_LABEL_HEIGHT = 14;
export const KI_GRAPH_LABEL_MAX_COUNT = 400;
export const KI_GRAPH_LABEL_LOW_ZOOM_HUBS = 8;
const LABEL_GAP = 2;
const LABEL_RECT_PADDING = 3;

interface AxisAlignedRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface KiGraphLabelPlacementNode {
  id: string;
  title: string;
  degree: number;
  occurrences?: number;
  position: { x: number; y: number };
  size: number;
}

export interface GetVisibleLabelIdsParams {
  nodes: readonly KiGraphLabelPlacementNode[];
  zoom: number;
  labelHeight: number;
  charWidth: number;
  maxLabels: number;
  minZoom?: number;
  maxLabelWidth?: number;
  lowZoomHubCount?: number;
}

const bucketZoom = (zoom: number): number =>
  Math.round(zoom / KI_GRAPH_LABEL_ZOOM_BUCKET) * KI_GRAPH_LABEL_ZOOM_BUCKET;

const padRect = (rect: AxisAlignedRect, padding: number): AxisAlignedRect => ({
  left: rect.left - padding,
  top: rect.top - padding,
  right: rect.right + padding,
  bottom: rect.bottom + padding,
});

const rectsOverlap = (a: AxisAlignedRect, b: AxisAlignedRect): boolean =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

const circleIntersectsRect = (
  centerX: number,
  centerY: number,
  radius: number,
  rect: AxisAlignedRect
): boolean => {
  const nearestX = Math.max(rect.left, Math.min(centerX, rect.right));
  const nearestY = Math.max(rect.top, Math.min(centerY, rect.bottom));
  const dx = centerX - nearestX;
  const dy = centerY - nearestY;
  return dx * dx + dy * dy <= radius * radius;
};

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

export const getVisibleLabelIds = ({
  nodes,
  zoom,
  labelHeight,
  charWidth,
  maxLabels,
  minZoom = KI_GRAPH_LABEL_MIN_ZOOM,
  maxLabelWidth = KI_GRAPH_LABEL_MAX_WIDTH,
  lowZoomHubCount = KI_GRAPH_LABEL_LOW_ZOOM_HUBS,
}: GetVisibleLabelIdsParams): ReadonlySet<string> => {
  if (nodes.length === 0 || zoom <= 0) {
    return new Set();
  }

  const sorted = [...nodes].sort(compareLabelPriority);
  const hubIds = topHubIds(sorted, lowZoomHubCount);
  const visible = new Set<string>();
  const placedLabels: AxisAlignedRect[] = [];

  for (const node of sorted) {
    if (visible.size >= maxLabels) {
      break;
    }

    if (zoom < minZoom && !hubIds.has(node.id)) {
      continue;
    }

    const centerX = (node.position.x + node.size / 2) * zoom;
    const titleWidth = Math.min(node.title.length * charWidth, maxLabelWidth) * zoom;
    const labelTop = (node.position.y + node.size + LABEL_GAP) * zoom;
    const labelRect = padRect(
      {
        left: centerX - titleWidth / 2,
        top: labelTop,
        right: centerX + titleWidth / 2,
        bottom: labelTop + labelHeight * zoom,
      },
      LABEL_RECT_PADDING
    );

    let blocked = false;
    for (const placed of placedLabels) {
      if (rectsOverlap(labelRect, placed)) {
        blocked = true;
        break;
      }
    }
    if (blocked) {
      continue;
    }

    for (const other of nodes) {
      if (other.id === node.id) {
        continue;
      }
      const otherCenterX = (other.position.x + other.size / 2) * zoom;
      const otherCenterY = (other.position.y + other.size / 2) * zoom;
      const otherRadius = (other.size / 2) * zoom;
      if (circleIntersectsRect(otherCenterX, otherCenterY, otherRadius, labelRect)) {
        blocked = true;
        break;
      }
    }
    if (blocked) {
      continue;
    }

    visible.add(node.id);
    placedLabels.push(labelRect);
  }

  return visible;
};

export const useVisibleLabelIds = (
  nodes: readonly KiGraphLabelPlacementNode[]
): ReadonlySet<string> => {
  const zoom = useStore((state) => state.transform[2]);
  const bucketedZoom = bucketZoom(zoom);

  return useMemo(
    () =>
      getVisibleLabelIds({
        nodes,
        zoom: bucketedZoom,
        labelHeight: KI_GRAPH_LABEL_HEIGHT,
        charWidth: KI_GRAPH_LABEL_CHAR_WIDTH,
        maxLabels: KI_GRAPH_LABEL_MAX_COUNT,
      }),
    [nodes, bucketedZoom]
  );
};
