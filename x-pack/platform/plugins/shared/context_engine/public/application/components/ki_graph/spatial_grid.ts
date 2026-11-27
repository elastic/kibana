/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AxisAlignedRect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

interface GridItem<T> {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly payload: T;
}

export interface UniformSpatialGrid<T> {
  readonly insertCircle: (x: number, y: number, radius: number, payload: T) => void;
  readonly forEachCircleIntersectingRect: (
    rect: AxisAlignedRect,
    visit: (payload: T, circle: { x: number; y: number; radius: number }) => void
  ) => void;
  readonly forEachRectOverlapping: (
    rect: AxisAlignedRect,
    visit: (payload: T, other: AxisAlignedRect) => void
  ) => void;
  readonly insertRect: (rect: AxisAlignedRect, payload: T) => void;
}

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

const rectsOverlap = (a: AxisAlignedRect, b: AxisAlignedRect): boolean =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

const cellKey = (col: number, row: number): string => `${col},${row}`;

export const createUniformSpatialGrid = <T>(cellSize: number): UniformSpatialGrid<T> => {
  const safeCellSize = cellSize > 0 ? cellSize : 1;
  const circles = new Map<string, GridItem<T>[]>();
  const rects = new Map<string, Array<{ rect: AxisAlignedRect; payload: T }>>();

  const colsForRect = (rect: AxisAlignedRect) => {
    const minCol = Math.floor(rect.left / safeCellSize);
    const maxCol = Math.floor(rect.right / safeCellSize);
    const minRow = Math.floor(rect.top / safeCellSize);
    const maxRow = Math.floor(rect.bottom / safeCellSize);
    return { minCol, maxCol, minRow, maxRow };
  };

  const forEachCellInRect = (rect: AxisAlignedRect, visit: (col: number, row: number) => void) => {
    const { minCol, maxCol, minRow, maxRow } = colsForRect(rect);
    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        visit(col, row);
      }
    }
  };

  return {
    insertCircle: (x, y, radius, payload) => {
      const rect: AxisAlignedRect = {
        left: x - radius,
        top: y - radius,
        right: x + radius,
        bottom: y + radius,
      };
      forEachCellInRect(rect, (col, row) => {
        const key = cellKey(col, row);
        const bucket = circles.get(key);
        const item: GridItem<T> = { x, y, radius, payload };
        if (bucket === undefined) {
          circles.set(key, [item]);
        } else {
          bucket.push(item);
        }
      });
    },

    forEachCircleIntersectingRect: (rect, visit) => {
      const seen = new Set<T>();
      forEachCellInRect(rect, (col, row) => {
        const bucket = circles.get(cellKey(col, row));
        if (bucket === undefined) {
          return;
        }
        for (const item of bucket) {
          if (seen.has(item.payload)) {
            continue;
          }
          if (circleIntersectsRect(item.x, item.y, item.radius, rect)) {
            seen.add(item.payload);
            visit(item.payload, { x: item.x, y: item.y, radius: item.radius });
          }
        }
      });
    },

    insertRect: (rect, payload) => {
      forEachCellInRect(rect, (col, row) => {
        const key = cellKey(col, row);
        const bucket = rects.get(key);
        const entry = { rect, payload };
        if (bucket === undefined) {
          rects.set(key, [entry]);
        } else {
          bucket.push(entry);
        }
      });
    },

    forEachRectOverlapping: (rect, visit) => {
      const seen = new Set<T>();
      forEachCellInRect(rect, (col, row) => {
        const bucket = rects.get(cellKey(col, row));
        if (bucket === undefined) {
          return;
        }
        for (const entry of bucket) {
          if (seen.has(entry.payload)) {
            continue;
          }
          if (rectsOverlap(rect, entry.rect)) {
            seen.add(entry.payload);
            visit(entry.payload, entry.rect);
          }
        }
      });
    },
  };
};
