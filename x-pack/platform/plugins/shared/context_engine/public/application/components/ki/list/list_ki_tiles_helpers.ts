/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { KiGroup } from '../../../../../common/http_api/knowledge_indicators';
import { formatKiTypeLabel } from '../../../utils/ki_display';
import { OTHER_SECTION_KEY, getTypeSectionKey } from './list_ki_groups_helpers';
import type { ListKiTileSelection } from './list_ki_groups_helpers';

/** Number of colors in the EUI vis palette (`euiColorVis0` … `euiColorVis9`). */
export const TILE_COLOR_COUNT = 10;

export interface ListKiTile {
  key: string;
  kind: 'type' | 'other';
  /** The KI type. Empty for "Other". */
  type: string;
  label: string;
  /** Documents of this tile that match the current search (0 = faded tile). */
  count: number;
  /** Documents of this tile without the search: keeps the tile width stable while typing. */
  baseCount: number;
  /** Index into the vis palette. Undefined for "Other" (neutral color). */
  colorIndex: number | undefined;
}

/** Counts that follow the search, for the stable tiles. */
export interface ListKiLiveCounts {
  groups: KiGroup[];
  totalOther: number;
}

export const otherTileLabel = i18n.translate(
  'xpack.contextEngine.aiIndexDetail.listKi.otherLabel',
  {
    defaultMessage: 'Other',
  }
);

/**
 * One tile per group (count order), then "Other" when other documents exist. The tiles come from
 * the groups without the search, so they stay while the user types; `live` gives the counts that
 * follow the search (a type without a match counts 0).
 * Colors follow the alphabetical position among the tiles: no two tiles share a color.
 */
export const buildTiles = (
  groups: KiGroup[],
  totalOther: number,
  live?: ListKiLiveCounts
): ListKiTile[] => {
  const alphabetical = groups.map(({ type }) => type).sort((a, b) => a.localeCompare(b));
  const liveCount = (type: string, baseCount: number): number =>
    live ? (live.groups.find((group) => group.type === type)?.count ?? 0) : baseCount;
  const typeTiles = groups.map(({ type, count }): ListKiTile => ({
    key: getTypeSectionKey(type),
    kind: 'type',
    type,
    label: formatKiTypeLabel(type),
    count: liveCount(type, count),
    baseCount: count,
    colorIndex: alphabetical.indexOf(type) % TILE_COLOR_COUNT,
  }));
  if (totalOther <= 0) {
    return typeTiles;
  }
  return [
    ...typeTiles,
    {
      key: OTHER_SECTION_KEY,
      kind: 'other',
      type: '',
      label: otherTileLabel,
      count: live ? live.totalOther : totalOther,
      baseCount: totalOther,
      colorIndex: undefined,
    },
  ];
};

/** Tile width weight: grows with the count, but big types do not crush small ones. */
export const getTileGrow = (count: number): number => Math.max(count, 1) ** 0.7;

/**
 * The count a tile's width follows. "Other" is many small types together, so it is never wider
 * than the biggest type tile.
 */
export const getTileWidthCount = (tile: ListKiTile, tiles: readonly ListKiTile[]): number => {
  if (tile.kind !== 'other') {
    return tile.baseCount;
  }
  const typeCounts = tiles.flatMap((other) => (other.kind === 'type' ? [other.baseCount] : []));
  return typeCounts.length > 0 ? Math.min(tile.baseCount, Math.max(...typeCounts)) : tile.baseCount;
};

export const isTileSelected = (tile: ListKiTile, selection: ListKiTileSelection): boolean =>
  tile.kind === 'other' ? selection.other : selection.types.has(tile.type);

export const toggleTile = (
  selection: ListKiTileSelection,
  tile: ListKiTile
): ListKiTileSelection => {
  if (tile.kind === 'other') {
    return { types: selection.types, other: !selection.other };
  }
  const types = new Set(selection.types);
  if (types.has(tile.type)) {
    types.delete(tile.type);
  } else {
    types.add(tile.type);
  }
  return { types, other: selection.other };
};

/**
 * Only the selected tiles that exist now. A type that a search pushed out of the groups stays in
 * the raw selection (it comes back when the search is cleared) but is ignored here.
 */
export const getEffectiveSelection = (
  selection: ListKiTileSelection,
  tiles: ListKiTile[]
): ListKiTileSelection => {
  const types = new Set(
    tiles
      .filter((tile) => tile.kind === 'type' && selection.types.has(tile.type))
      .map(({ type }) => type)
  );
  const other = selection.other && tiles.some((tile) => tile.kind === 'other');
  return { types, other };
};

/** A stable string for a selection, to notice when it changes. */
export const getSelectionKey = ({ types, other }: ListKiTileSelection): string =>
  JSON.stringify({ types: [...types].sort(), other });
