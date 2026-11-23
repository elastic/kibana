/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KiGroup } from '../../../../../common/http_api/knowledge_indicators';
import { EMPTY_TILE_SELECTION } from './list_ki_groups_helpers';
import {
  buildTiles,
  getEffectiveSelection,
  getSelectionKey,
  getTileGrow,
  getTileWidthCount,
  toggleTile,
} from './list_ki_tiles_helpers';

const group = (type: string, count: number): KiGroup => ({ type, count, kis: [] });

const groups = [group('zeta', 30), group('alpha', 20), group('index_metadata', 5)];

describe('buildTiles', () => {
  it('makes one tile per group in count order, then "Other" when other documents exist', () => {
    const tiles = buildTiles(groups, 12);
    expect(tiles.map(({ key, label, count }) => [key, label, count])).toEqual([
      ['type:zeta', 'zeta', 30],
      ['type:alpha', 'alpha', 20],
      ['type:index_metadata', 'index metadata', 5],
      ['other', 'Other', 12],
    ]);
  });

  it('has no "Other" tile when every document is in a group', () => {
    expect(buildTiles(groups, 0).some(({ kind }) => kind === 'other')).toBe(false);
  });

  it('colors by alphabetical position, so no two tiles share a color', () => {
    const tiles = buildTiles(groups, 3);
    expect(tiles.map(({ colorIndex }) => colorIndex)).toEqual([2, 0, 1, undefined]);
  });

  it('keeps the tiles of the base groups and takes the counts from the search (0 when missing)', () => {
    const tiles = buildTiles(groups, 12, { groups: [group('alpha', 4)], totalOther: 1 });
    expect(
      tiles.map(({ key, count, baseCount, colorIndex }) => [key, count, baseCount, colorIndex])
    ).toEqual([
      ['type:zeta', 0, 30, 2],
      ['type:alpha', 4, 20, 0],
      ['type:index_metadata', 0, 5, 1],
      ['other', 1, 12, undefined],
    ]);
  });
});

describe('getTileGrow', () => {
  it('grows with the count, slower than the count', () => {
    expect(getTileGrow(100)).toBeGreaterThan(getTileGrow(10));
    expect(getTileGrow(100) / getTileGrow(1)).toBeLessThan(100);
    expect(getTileGrow(0)).toBe(1);
  });
});

describe('getTileWidthCount', () => {
  it('uses the count without the search for type tiles', () => {
    const tiles = buildTiles(groups, 99, { groups: [group('alpha', 4)], totalOther: 1 });
    expect(getTileWidthCount(tiles[1], tiles)).toBe(20);
  });

  it('never makes "Other" wider than the biggest type tile', () => {
    const big = buildTiles(groups, 99);
    expect(getTileWidthCount(big[3], big)).toBe(30);
    const small = buildTiles(groups, 3);
    expect(getTileWidthCount(small[3], small)).toBe(3);
  });

  it('keeps the "Other" count when there is no type tile', () => {
    const tiles = buildTiles([], 7);
    expect(getTileWidthCount(tiles[0], tiles)).toBe(7);
  });
});

describe('tile selection', () => {
  const tiles = buildTiles(groups, 4);
  const [zeta, , , other] = tiles;

  it('toggles types and "Other" separately', () => {
    const withZeta = toggleTile(EMPTY_TILE_SELECTION, zeta);
    const withOther = toggleTile(withZeta, other);
    expect([...withOther.types]).toEqual(['zeta']);
    expect(withOther.other).toBe(true);
    expect(toggleTile(withOther, zeta).types.size).toBe(0);
  });

  it('ignores selected types that are no tile now, but keeps them in the raw selection', () => {
    const raw = { types: new Set(['alpha', 'gone']), other: true };
    const effective = getEffectiveSelection(raw, buildTiles(groups, 0));
    expect([...effective.types]).toEqual(['alpha']);
    expect(effective.other).toBe(false);
    expect(raw.types.has('gone')).toBe(true);
  });

  it('builds the same key for the same selection in any order', () => {
    expect(getSelectionKey({ types: new Set(['b', 'a']), other: false })).toBe(
      getSelectionKey({ types: new Set(['a', 'b']), other: false })
    );
  });
});
