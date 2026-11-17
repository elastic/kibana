/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useQueries } from '@kbn/react-query';
import { useEffect, useMemo, useRef } from 'react';
import type { KiStatus } from '../../../common/ki_lifecycle_status';
import type { KiListSort } from '../../../common/ki_list_sort';
import type { KiListItem, ListKisResponse } from '../../../common/http_api/knowledge_indicators';
import { listKis } from '../api/knowledge_indicators';
import { getErrorMessage } from '../utils/get_error_message';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

interface UseListKiByTypeArgs {
  aiIndexId: string;
  /** Requested size per type. Only types in this map are fetched. */
  sizesByType: Record<string, number>;
  query?: string;
  status: KiStatus[];
  sort: KiListSort;
}

export interface ListKiByTypeResult {
  /** Undefined until the first "Show more" page of this type arrives. */
  kis: KiListItem[] | undefined;
  isFetching: boolean;
  /** The last request of this type failed (after react-query's own retries). */
  isError: boolean;
  /** Sends the failed request again. A new click asks for the same size, so it would not. */
  retry: () => void;
}

const loadMoreErrorTitle = i18n.translate('xpack.contextEngine.listKi.loadMoreErrorTitle', {
  defaultMessage: 'Unable to load more Knowledge documents',
});

/** Loads more documents of single types ("Show more" in a list group). */
export const useListKiByType = ({
  aiIndexId,
  sizesByType,
  query,
  status,
  sort,
}: UseListKiByTypeArgs): Record<string, ListKiByTypeResult | undefined> => {
  const {
    services: { http, notifications },
  } = useKibana();
  const entries = useMemo(() => Object.entries(sizesByType), [sizesByType]);
  // `keepPreviousData` does not work with `useQueries`, so the last rows of each type are kept
  // here. The key includes the filters, so rows from other filters are never reused.
  const lastKisRef = useRef(new Map<string, KiListItem[]>());
  const filterKey = `${query ?? ''}|${status.join(',')}|${sort}`;

  const results = useQueries({
    queries: entries.map(([type, size]) => ({
      queryKey: contextEngineQueryKeys.aiIndex.listKi(aiIndexId, size, type, query, status, sort),
      queryFn: ({ signal }: { signal?: AbortSignal }): Promise<ListKisResponse> =>
        listKis(http, {
          aiIndexId,
          size,
          type,
          ...(query !== undefined ? { query } : {}),
          status: [...status],
          sort,
          signal,
        }),
    })),
  });

  // One toast per failed request; the failed query keeps the same error until it is retried.
  const notifiedErrorsRef = useRef(new WeakSet<object>());
  useEffect(() => {
    results.forEach(({ error, isFetching }) => {
      if (isFetching || typeof error !== 'object' || error === null) {
        return;
      }
      if (notifiedErrorsRef.current.has(error)) {
        return;
      }
      notifiedErrorsRef.current.add(error);
      notifications.toasts.addError(error instanceof Error ? error : new Error(String(error)), {
        title: loadMoreErrorTitle,
        toastMessage: getErrorMessage(error),
      });
    });
  }, [notifications, results]);

  return Object.fromEntries(
    entries.map(([type], position) => {
      const { data, isFetching, isError, refetch } = results[position];
      const lastKey = `${filterKey}|${type}`;
      if (data) {
        lastKisRef.current.set(lastKey, data.kis);
      }
      // Until the bigger page arrives, the group keeps the rows it already shows.
      return [
        type,
        {
          kis: data?.kis ?? lastKisRef.current.get(lastKey),
          isFetching,
          isError,
          retry: () => {
            refetch();
          },
        },
      ];
    })
  );
};
