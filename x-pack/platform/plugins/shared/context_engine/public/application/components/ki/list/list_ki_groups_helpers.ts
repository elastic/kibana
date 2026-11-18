/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_KI_PAGE_SIZE, MAX_KI_PAGE_SIZE } from '../../../../../common/constants';
import type { KiTypeCount } from '../../../../../common/http_api/ai_indices';
import type { KiListItem } from '../../../../../common/http_api/knowledge_indicators';
import type { ListKiTypeFilter } from './list_ki_helpers';

export interface ListKiGroup {
  type: string;
  /** All documents of this type that match the filters, not only the loaded ones. */
  count: number;
  kis: KiListItem[];
  canShowMore: boolean;
  /** The group hit the per-type limit and more documents exist. */
  isCapReached: boolean;
  isLoadingMore: boolean;
}

export interface ListKiGroupResult {
  kis: KiListItem[] | undefined;
  isFetching: boolean;
}

interface BuildListKiGroupsArgs {
  /** First page of documents (all types mixed). */
  kis: KiListItem[];
  /** Total of the first page request (type filter applied). */
  total: number;
  countsByType: KiTypeCount[];
  typeFilter: ListKiTypeFilter;
  /** Rows loaded with "Show more", per type. */
  groupResults: Record<string, ListKiGroupResult | undefined>;
}

const toGroup = (
  type: string,
  count: number,
  baseKis: KiListItem[],
  groupResult: ListKiGroupResult | undefined
): ListKiGroup => {
  const kis = groupResult?.kis ?? baseKis;
  const hasMore = kis.length < count;
  return {
    type,
    count,
    kis,
    canShowMore: hasMore && kis.length < MAX_KI_PAGE_SIZE,
    isCapReached: hasMore && kis.length >= MAX_KI_PAGE_SIZE,
    isLoadingMore: groupResult?.isFetching ?? false,
  };
};

/**
 * Groups the loaded documents by type. One group per type count from the API (biggest first),
 * plus a group for loaded types the API did not count (it returns only the top types).
 * Documents without a type are not in any group.
 */
export const buildListKiGroups = ({
  kis,
  total,
  countsByType,
  typeFilter,
  groupResults,
}: BuildListKiGroupsArgs): ListKiGroup[] => {
  const kisOfType = (type: string) => kis.filter((ki) => ki.type === type);

  if (typeFilter.kind === 'type') {
    const { value: type } = typeFilter;
    return total > 0 ? [toGroup(type, total, kisOfType(type), groupResults[type])] : [];
  }

  const countedTypes = new Set(countsByType.map(({ type }) => type));
  const uncountedTypes = [
    ...new Set(
      kis.flatMap(({ type }) =>
        type !== undefined && type.length > 0 && !countedTypes.has(type) ? [type] : []
      )
    ),
  ];

  return [
    ...countsByType.map(({ type, count }) =>
      toGroup(type, count, kisOfType(type), groupResults[type])
    ),
    ...uncountedTypes.map((type) => {
      const loaded = kisOfType(type);
      return toGroup(type, loaded.length, loaded, undefined);
    }),
  ];
};

/** Size for the next "Show more" request of a group. */
export const getNextGroupSize = (loadedCount: number): number =>
  Math.min(loadedCount + DEFAULT_KI_PAGE_SIZE, MAX_KI_PAGE_SIZE);
