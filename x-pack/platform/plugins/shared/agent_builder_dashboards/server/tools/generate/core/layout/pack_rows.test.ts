/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_ROW_ITEM_HEIGHT,
  GRID_COLUMN_COUNT,
  ROW_ITEM_HEIGHT_BY_CHART_TYPE,
  getRowItemHeight,
  packRows,
  type PackableRowItem,
} from './pack_rows';

type PanelGrid = ReturnType<typeof packRows>[number][number];

/** Deterministic Park–Miller PRNG so the property cases are reproducible. */
const createRandom = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
};

const randomInt = (random: () => number, min: number, max: number): number =>
  min + Math.floor(random() * (max - min + 1));

const CHART_TYPES = [...Object.keys(ROW_ITEM_HEIGHT_BY_CHART_TYPE), 'unknown_chart'];

const createRandomItem = (random: () => number): PackableRowItem => {
  const kind = randomInt(random, 0, 3);
  switch (kind) {
    case 0:
      return { source: 'config', type: 'markdown', config: { content: '### Summary' } };
    case 1: {
      // Config-source vis: chart type read from the Lens API config's top-level `type`.
      const chartType = CHART_TYPES[randomInt(random, 0, CHART_TYPES.length - 1)];
      return { source: 'config', type: 'vis', config: { type: chartType } };
    }
    case 2:
      // Request-source vis without a chart type: default size class.
      return { source: 'request', type: 'vis' };
    default: {
      const chartType = CHART_TYPES[randomInt(random, 0, CHART_TYPES.length - 1)];
      return { source: 'request', type: 'vis', chartType };
    }
  }
};

const gridsOverlap = (a: PanelGrid, b: PanelGrid): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe('getRowItemHeight', () => {
  it('uses the markdown size class for markdown items', () => {
    expect(
      getRowItemHeight({ source: 'config', type: 'markdown', config: { content: 'hi' } })
    ).toBe(ROW_ITEM_HEIGHT_BY_CHART_TYPE.markdown);
  });

  it('uses the chartType size class for request-source vis items', () => {
    expect(getRowItemHeight({ source: 'request', type: 'vis', chartType: 'metric' })).toBe(5);
    expect(getRowItemHeight({ source: 'request', type: 'vis', chartType: 'datatable' })).toBe(14);
  });

  it('falls back to the default for request-source vis items without a chartType', () => {
    expect(getRowItemHeight({ source: 'request', type: 'vis' })).toBe(DEFAULT_ROW_ITEM_HEIGHT);
  });

  it('falls back to the default for unknown chart types', () => {
    expect(getRowItemHeight({ source: 'request', type: 'vis', chartType: 'not_a_chart' })).toBe(
      DEFAULT_ROW_ITEM_HEIGHT
    );
  });

  it('reads the chart type from a config-source vis config when present', () => {
    expect(getRowItemHeight({ source: 'config', type: 'vis', config: { type: 'heatmap' } })).toBe(
      12
    );
  });

  it('falls back to the default when the config-source chart type is not readable', () => {
    expect(getRowItemHeight({ source: 'config', type: 'vis', config: {} })).toBe(
      DEFAULT_ROW_ITEM_HEIGHT
    );
    expect(getRowItemHeight({ source: 'config', type: 'vis', config: { type: 42 } })).toBe(
      DEFAULT_ROW_ITEM_HEIGHT
    );
  });
});

describe('packRows', () => {
  it('packs the guidance worked example (4 metrics / 2 xy / 1 datatable)', () => {
    const metric: PackableRowItem = { source: 'request', type: 'vis', chartType: 'metric' };
    const xy: PackableRowItem = { source: 'request', type: 'vis', chartType: 'xy' };
    const datatable: PackableRowItem = { source: 'request', type: 'vis', chartType: 'datatable' };

    expect(packRows([[metric, metric, metric, metric], [xy, xy], [datatable]], 0)).toEqual([
      [
        { x: 0, y: 0, w: 12, h: 5 },
        { x: 12, y: 0, w: 12, h: 5 },
        { x: 24, y: 0, w: 12, h: 5 },
        { x: 36, y: 0, w: 12, h: 5 },
      ],
      [
        { x: 0, y: 5, w: 24, h: 10 },
        { x: 24, y: 5, w: 24, h: 10 },
      ],
      [{ x: 0, y: 15, w: 48, h: 14 }],
    ]);
  });

  it('spreads the width remainder from the left so each row sums to exactly 48', () => {
    const item: PackableRowItem = { source: 'request', type: 'vis' };

    const [rowGrids] = packRows([[item, item, item, item, item]], 0);

    expect(rowGrids.map(({ w }) => w)).toEqual([10, 10, 10, 9, 9]);
    expect(rowGrids.map(({ x }) => x)).toEqual([0, 10, 20, 30, 39]);
  });

  it('sizes each row to the max of its members and starts at startY', () => {
    const metric: PackableRowItem = { source: 'request', type: 'vis', chartType: 'metric' };
    const heatmap: PackableRowItem = { source: 'request', type: 'vis', chartType: 'heatmap' };

    const grids = packRows([[metric, heatmap], [metric]], 7);

    expect(grids[0].every(({ h, y }) => h === 12 && y === 7)).toBe(true);
    expect(grids[1]).toEqual([{ x: 0, y: 19, w: 48, h: 5 }]);
  });

  it('holds the packing invariants across many generated row shapes', () => {
    const random = createRandom(20260701);

    for (let caseIndex = 0; caseIndex < 250; caseIndex++) {
      const rows = Array.from({ length: randomInt(random, 1, 5) }, () =>
        Array.from({ length: randomInt(random, 1, 8) }, () => createRandomItem(random))
      );
      const startY = randomInt(random, 0, 40);

      const grids = packRows(rows, startY);

      expect(grids).toHaveLength(rows.length);

      let expectedRowY = startY;
      grids.forEach((rowGrids, rowIndex) => {
        expect(rowGrids).toHaveLength(rows[rowIndex].length);

        // Widths are >= 1 integers summing to exactly 48, tiled left to right.
        expect(rowGrids.reduce((sum, { w }) => sum + w, 0)).toBe(GRID_COLUMN_COUNT);
        let expectedX = 0;
        for (const grid of rowGrids) {
          expect(Number.isInteger(grid.w)).toBe(true);
          expect(grid.w).toBeGreaterThanOrEqual(1);
          expect(grid.x).toBe(expectedX);
          expect(grid.x + grid.w).toBeLessThanOrEqual(GRID_COLUMN_COUNT);
          expectedX += grid.w;
        }

        // All members share the row's y and height; y strictly increases across rows.
        const rowHeight = rowGrids[0].h;
        expect(rowHeight).toBeGreaterThanOrEqual(1);
        expect(rowGrids.every(({ y, h }) => y === expectedRowY && h === rowHeight)).toBe(true);
        expectedRowY += rowHeight;
      });

      // No two produced grids overlap.
      const flatGrids = grids.flat();
      for (let i = 0; i < flatGrids.length; i++) {
        for (let j = i + 1; j < flatGrids.length; j++) {
          expect(gridsOverlap(flatGrids[i], flatGrids[j])).toBe(false);
        }
      }

      // Deterministic: the same input packs to the same grids.
      expect(packRows(rows, startY)).toEqual(grids);
    }
  });
});
