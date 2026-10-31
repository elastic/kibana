/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveTableHeight } from './resolve_table_height';

const bounded = (rowCount: number, overrides = {}) =>
  resolveTableHeight({
    height: '100%',
    minHeight: 200,
    maxHeight: 600,
    rowHeightLines: 3,
    rowCount,
    defaultRowHeightLines: 3,
    ...overrides,
  });

describe('resolveTableHeight', () => {
  it('keeps the given height when no ceiling is set', () => {
    expect(
      resolveTableHeight({
        height: '100%',
        rowHeightLines: 3,
        rowCount: 50,
        defaultRowHeightLines: 3,
      })
    ).toBe('100%');
  });

  it('sits on the floor when there are no rows', () => {
    expect(bounded(0)).toBe(200);
  });

  it('sits on the floor while the rows still fit inside it', () => {
    expect(bounded(1)).toBe(200);
  });

  it('grows with the rows once they pass the floor', () => {
    expect(bounded(3)).toBe(376);
  });

  it('stops at the ceiling so the rest scrolls', () => {
    expect(bounded(50)).toBe(600);
  });

  it('allows for taller rows when more lines are shown', () => {
    expect(bounded(3, { rowHeightLines: 5 })).toBe(520);
  });

  it('falls back to the default line count when rows auto-size', () => {
    expect(bounded(3, { rowHeightLines: -1 })).toBe(bounded(3));
  });

  it('treats a missing floor as zero', () => {
    expect(bounded(0, { minHeight: undefined })).toBe(88);
  });
});
