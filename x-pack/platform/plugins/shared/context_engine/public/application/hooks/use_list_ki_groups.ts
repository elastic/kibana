/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { KiStatus } from '../../../common/ki_lifecycle_status';
import type { KiListSort } from '../../../common/ki_list_sort';
import type { KiGroup, ListKiGroupsResponse } from '../../../common/http_api/knowledge_indicators';
import { listKiGroups } from '../api/knowledge_indicators';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

interface UseListKiGroupsArgs {
  aiIndexId: string;
  maxGroups: number;
  /** Exactly these types as groups, instead of the biggest ones. */
  types?: readonly string[];
  /** Leaves these types out before grouping. */
  excludeTypes?: readonly string[];
  previewSize: number;
  query?: string;
  status: readonly KiStatus[];
  sort: KiListSort;
  enabled?: boolean;
}

export interface UseListKiGroupsResult {
  groups: KiGroup[];
  total: number;
  totalOther: number;
  isLoading: boolean;
  isFetching: boolean;
  /** The shown groups belong to the previous filters while the new request runs. */
  isPreviousData: boolean;
  error: Error | undefined;
}

const EMPTY_GROUPS: KiGroup[] = [];

/** The biggest KI types with their first KIs, plus the count of all other KIs. */
export const useListKiGroups = ({
  aiIndexId,
  maxGroups,
  types,
  excludeTypes,
  previewSize,
  query,
  status,
  sort,
  enabled = true,
}: UseListKiGroupsArgs): UseListKiGroupsResult => {
  const {
    services: { http },
  } = useKibana();

  const { data, isLoading, isFetching, isPreviousData, error } = useQuery<
    ListKiGroupsResponse,
    Error
  >({
    queryKey: contextEngineQueryKeys.aiIndex.listKiGroups(
      aiIndexId,
      maxGroups,
      previewSize,
      query,
      status,
      sort,
      types,
      excludeTypes
    ),
    queryFn: ({ signal }) =>
      listKiGroups(http, {
        aiIndexId,
        maxGroups,
        ...(types !== undefined ? { types: [...types] } : {}),
        ...(excludeTypes !== undefined ? { excludeTypes: [...excludeTypes] } : {}),
        previewSize,
        ...(query !== undefined ? { query } : {}),
        status: [...status],
        sort,
        signal,
      }),
    enabled,
    keepPreviousData: true,
  });

  return {
    groups: data?.groups ?? EMPTY_GROUPS,
    total: data?.total ?? 0,
    totalOther: data?.total_other ?? 0,
    isLoading,
    isFetching,
    isPreviousData,
    error: error ?? undefined,
  };
};
