/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { layoutCells } from './status_grid';

describe('layoutCells', () => {
  it('defaults to a slightly wide grid rather than a square block', () => {
    // ceil(sqrt(1071) * 1.3) = 43 columns for 1,071 pods.
    expect(layoutCells(1071, 'hex').columns).toBe(43);
  });

  it('honours an explicit column count', () => {
    expect(layoutCells(100, 'hex', 10).columns).toBe(10);
  });

  it('interlocks flat-top hexagons at three quarters of their width', () => {
    const { position } = layoutCells(4, 'hex', 4);
    // Circumradius 1, so the width is 2 and the column pitch is 1.5.
    expect(position(1).x - position(0).x).toBeCloseTo(1.5);
  });

  it('offsets odd columns by half a row, which is what makes it a honeycomb', () => {
    const { position } = layoutCells(4, 'hex', 4);
    expect(position(1).y - position(0).y).toBeCloseTo(Math.sqrt(3) / 2);
    expect(position(2).y).toBeCloseTo(position(0).y);
  });

  it('wraps to the next row after the last column', () => {
    const { position } = layoutCells(6, 'hex', 3);
    expect(position(3).x).toBeCloseTo(position(0).x);
    expect(position(3).y).toBeGreaterThan(position(0).y);
  });

  it('sizes the viewBox to hold every cell', () => {
    const { width, height, position } = layoutCells(9, 'hex', 3);
    // A flat-top hexagon of circumradius 1 is 2 wide but only sqrt(3) tall, so
    // its half-extents differ by axis.
    const halfHeight = Math.sqrt(3) / 2;
    for (let index = 0; index < 9; index++) {
      const { x, y } = position(index);
      expect(x + 1).toBeLessThanOrEqual(width + 1e-9);
      expect(y + halfHeight).toBeLessThanOrEqual(height + 1e-9);
      expect(x - 1).toBeGreaterThanOrEqual(-1e-9);
      expect(y - halfHeight).toBeGreaterThanOrEqual(-1e-9);
    }
  });

  it('lays squares out on a plain grid with no offset', () => {
    const { position } = layoutCells(4, 'square', 2);
    expect(position(1).y).toBe(position(0).y);
    expect(position(2).x).toBe(position(0).x);
  });

  it('never divides by zero on an empty result', () => {
    expect(() => layoutCells(0, 'hex')).not.toThrow();
    expect(layoutCells(0, 'hex').columns).toBeGreaterThan(0);
  });
});
