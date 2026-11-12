/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGridRowsForHeight } from './panel_height';

describe('getGridRowsForHeight', () => {
  const withMargins = { hasTitleBar: false, useMargins: true };

  it('gives the fewest rows whose height covers the content', () => {
    // With margins, n rows are 28n - 8 px tall.
    expect(getGridRowsForHeight(292, withMargins)).toBe(11);
    expect(getGridRowsForHeight(1200, withMargins)).toBe(44);
  });

  it('adds the title bar when the panel has one', () => {
    // The title bar is 32 px, so 292 + 32 + 8 = 332 px needs 12 rows.
    expect(getGridRowsForHeight(292, { ...withMargins, hasTitleBar: true })).toBe(12);
  });

  it('uses rows of the bare row height when the dashboard has no margins', () => {
    expect(getGridRowsForHeight(292, { hasTitleBar: false, useMargins: false })).toBe(15);
  });
});
