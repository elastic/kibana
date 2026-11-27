/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createUniformSpatialGrid } from './spatial_grid';

describe('createUniformSpatialGrid', () => {
  it('returns only circles whose bounds intersect the query rect', () => {
    const grid = createUniformSpatialGrid<string>(10);
    grid.insertCircle(0, 0, 5, 'a');
    grid.insertCircle(100, 100, 5, 'b');

    const hits: string[] = [];
    grid.forEachCircleIntersectingRect({ left: -1, top: -1, right: 1, bottom: 1 }, (id) => {
      hits.push(id);
    });

    expect(hits).toEqual(['a']);
  });

  it('detects overlapping label rects stored in the grid', () => {
    const grid = createUniformSpatialGrid<number>(20);
    grid.insertRect({ left: 0, top: 0, right: 10, bottom: 10 }, 1);

    const overlaps: number[] = [];
    grid.forEachRectOverlapping({ left: 5, top: 5, right: 15, bottom: 15 }, (id) => {
      overlaps.push(id);
    });

    expect(overlaps).toEqual([1]);
  });

  it('does not report disjoint rects as overlapping', () => {
    const grid = createUniformSpatialGrid<number>(20);
    grid.insertRect({ left: 0, top: 0, right: 10, bottom: 10 }, 1);

    const overlaps: number[] = [];
    grid.forEachRectOverlapping({ left: 20, top: 20, right: 30, bottom: 30 }, (id) => {
      overlaps.push(id);
    });

    expect(overlaps).toEqual([]);
  });
});
