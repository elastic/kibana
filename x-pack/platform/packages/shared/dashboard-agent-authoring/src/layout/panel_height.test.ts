/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGridRowsForHeight } from './panel_height';

describe('getGridRowsForHeight', () => {
  it('gives the fewest rows whose height covers the content', () => {
    // n rows are 28n - 8 px tall.
    expect(getGridRowsForHeight(292, false)).toBe(11);
    expect(getGridRowsForHeight(1200, false)).toBe(44);
  });

  it('adds the title bar when the panel has a title', () => {
    expect(getGridRowsForHeight(292, true)).toBe(13);
    expect(getGridRowsForHeight(200, true)).toBe(9);
  });

  it('keeps a panel from collapsing or growing without bound', () => {
    expect(getGridRowsForHeight(0, false)).toBe(4);
    expect(getGridRowsForHeight(100_000, true)).toBe(80);
  });
});
