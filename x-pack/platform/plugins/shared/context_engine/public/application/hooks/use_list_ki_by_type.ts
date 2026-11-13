/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQueries } from '@kbn/react-query';
import { useMemo, useRef } from 'react';
import type { KiLifecycleStatus } from '../../../common/step_types/ki';
import type { KiListItem, ListKisResponse } from '../../../common/http_api/knowledge_indicators';
import { listKis } from '../api/knowledge_indicators';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

interface UseListKiByTypeArgs {
  aiIndexId: string;
  /** Requested size per type. Only types in this map are fetched. */
  sizesByType: Record<string, number>;
  query?: string;
  lifecycleStatus: KiLifecycleStatus[];
}

export interface ListKiByTypeResult {
  /** Undefined until the first "Show more" page of this type arrives. */
  kis: KiListItem[] | undefined;
  isFetching: boolean;
}

/** Loads more documents of single types ("Show more" in a list group). */
export const useListKiByType = ({
  aiIndexId,
  sizesByType,
  query,
  lifecycleStatus,
}: UseListKiByTypeArgs): Record<string, ListKiByTypeResult | undefined> => {
  const {
    services: { http },
  } = useKibana();
  const entries = useMemo(() => Object.entries(sizesByType), [sizesByType]);
  // `keepPreviousData` does not work with `useQueries`, so the last rows of each type are kept
  // here. The key includes the filters, so rows from other filters are never reused.
  const lastKisRef = useRef(new Map<string, KiListItem[]>());
  const filterKey = `${query ?? ''}|${lifecycleStatus.join(',')}`;

  const results = useQueries({
    queries: entries.map(([type, size]) => ({
      queryKey: contextEngineQueryKeys.aiIndex.listKi(
        aiIndexId,
        size,
        type,
        query,
        lifecycleStatus
      ),
      queryFn: ({ signal }: { signal?: AbortSignal }): Promise<ListKisResponse> =>
        listKis(http, {
          aiIndexId,
          size,
          type,
          ...(query !== undefined ? { query } : {}),
          lifecycleStatus: [...lifecycleStatus],
          signal,
        }),
    })),
  });

  return Object.fromEntries(
    entries.map(([type], position) => {
      const { data, isFetching } = results[position];
      const lastKey = `${filterKey}|${type}`;
      if (data) {
        lastKisRef.current.set(lastKey, data.kis);
      }
      // Until the bigger page arrives, the group keeps the rows it already shows.
      return [type, { kis: data?.kis ?? lastKisRef.current.get(lastKey), isFetching }];
    })
  );
};
