/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_KI_GROUP_PREVIEW_SIZE, MAX_KI_PAGE_SIZE } from '../../../../../common/constants';
import type { KiGroup, KiListItem } from '../../../../../common/http_api/knowledge_indicators';

/** Rows per section: on page load (each group and "Other"), then per "Show more". */
export const LIST_KI_PAGE_SIZE = MAX_KI_GROUP_PREVIEW_SIZE;

/** Key of the "Other" section. Type sections use `type:<type>`, so a type can never clash. */
export const OTHER_SECTION_KEY = 'other';

export const getTypeSectionKey = (type: string): string => `type:${type}`;

/**
 * Reads a record entry by a KI type. Types are free text, so a type like `constructor` must not
 * read a value inherited from `Object.prototype`.
 */
export const getOwnValue = <T>(record: Record<string, T>, key: string): T | undefined =>
  Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;

export interface ListKiGroup {
  /** Stable key: `type:<type>` or `other`. */
  key: string;
  kind: 'type' | 'other';
  /** The KI type. Empty for the "Other" section. */
  type: string;
  /** All documents of this section that match the filters, not only the loaded ones. */
  count: number;
  kis: KiListItem[];
  canShowMore: boolean;
  /** The section hit the page cap and more documents exist. */
  isCapReached: boolean;
  isLoadingMore: boolean;
}

export interface ListKiGroupResult {
  kis: KiListItem[] | undefined;
  isFetching: boolean;
}

/** Selected tiles. `other` is separate because type names are free text. */
export interface ListKiTileSelection {
  types: ReadonlySet<string>;
  other: boolean;
}

export const EMPTY_TILE_SELECTION: ListKiTileSelection = { types: new Set(), other: false };

export interface ListKiOtherResult {
  /**
   * "Other" split by type. Undefined until it loads (or after an error): then "Other" is one
   * flat section.
   */
  byType?: {
    /** The biggest types outside the tiles, each shown as its own section. */
    groups: KiGroup[];
    /** Documents outside the tiles and outside `groups`: the last, flat "Other" section. */
    restCount: number;
  };
  /** Rows of the flat "Other" section. */
  kis: KiListItem[];
  /** Total of the flat "Other" request, undefined until it answers. */
  total: number | undefined;
  isFetching: boolean;
}

interface BuildListKiSectionsArgs {
  groups: KiGroup[];
  totalOther: number;
  /** Rows loaded with a tile click or "Show more", per type. */
  groupResults: Record<string, ListKiGroupResult | undefined>;
  other: ListKiOtherResult;
  /** Effective selection (only tiles that exist now). */
  selection: ListKiTileSelection;
  /** Tile order. Sections follow it, so they match the tiles also while searching. */
  typeOrder?: string[];
}

const toSection = ({
  key,
  kind,
  type,
  count,
  kis,
  isLoadingMore,
}: Omit<ListKiGroup, 'canShowMore' | 'isCapReached'>): ListKiGroup => {
  const hasMore = kis.length < count;
  return {
    key,
    kind,
    type,
    count,
    kis,
    canShowMore: hasMore && kis.length < MAX_KI_PAGE_SIZE,
    isCapReached: hasMore && kis.length >= MAX_KI_PAGE_SIZE,
    isLoadingMore,
  };
};

export const hasTileSelection = ({ types, other }: ListKiTileSelection): boolean =>
  types.size > 0 || other;

/**
 * The "Other" section is shown when its tile is selected. Without a selection it is also shown
 * when no type group matches (e.g. every document has no type, or a search matches only "Other"),
 * so the list is never empty while matching documents exist. A selection is strict: it never
 * brings in "Other" unless that tile is selected.
 */
export const isOtherSectionShown = (
  groups: KiGroup[],
  totalOther: number,
  selection: ListKiTileSelection
): boolean =>
  totalOther > 0 && (selection.other || (!hasTileSelection(selection) && groups.length === 0));

/**
 * The list sections: the type groups (all, or only the selected ones), then "Other" when shown.
 * "Other" keeps the real types: its biggest types are sections of their own, the rest is one
 * flat "Other" section at the end.
 * A type section shows the rows loaded for it, or the preview rows from the groups response.
 */
export const buildListKiSections = ({
  groups,
  totalOther,
  groupResults,
  other,
  selection,
  typeOrder,
}: BuildListKiSectionsArgs): ListKiGroup[] => {
  const showAllTypes = !hasTileSelection(selection);
  const position = (type: string): number => {
    const index = typeOrder?.indexOf(type) ?? -1;
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };
  const orderedGroups = typeOrder
    ? [...groups].sort((a, b) => position(a.type) - position(b.type))
    : groups;
  const toTypeSection = ({ type, count, kis }: KiGroup): ListKiGroup => {
    const groupResult = getOwnValue(groupResults, type);
    return toSection({
      key: getTypeSectionKey(type),
      kind: 'type',
      type,
      count,
      kis: groupResult?.kis ?? kis,
      isLoadingMore: groupResult?.isFetching ?? false,
    });
  };
  const typeSections = orderedGroups
    .filter(({ type }) => showAllTypes || selection.types.has(type))
    .map(toTypeSection);

  if (!isOtherSectionShown(groups, totalOther, selection)) {
    return typeSections;
  }

  const otherTypeSections = (other.byType?.groups ?? []).map(toTypeSection);
  const restCount = other.byType ? other.byType.restCount : totalOther;
  if (restCount <= 0) {
    return [...typeSections, ...otherTypeSections];
  }
  const otherSection = toSection({
    key: OTHER_SECTION_KEY,
    kind: 'other',
    type: '',
    // The "Other" response knows the exact count; until it answers, the groups response does.
    count: other.total ?? restCount,
    kis: other.kis,
    isLoadingMore: other.isFetching,
  });
  return [...typeSections, ...otherTypeSections, otherSection];
};

/** Size for the next "Show more" request of a section. */
export const getNextGroupSize = (loadedCount: number): number =>
  Math.min(loadedCount + LIST_KI_PAGE_SIZE, MAX_KI_PAGE_SIZE);
