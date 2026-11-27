/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery } from '@kbn/react-query';
import { findActivity } from '../../api/client';
import { investigationKeys } from '../../api/query_keys';
import { useInvestigationsServices } from '../../services';

const PAGE_SIZE = 100;
const FRESH_MS = 5000;

export type SortOrder = 'asc' | 'desc';

/**
 * The response log, one page of 100 at a time. It sits under the record's activity key, so the
 * shell's live polling refreshes every loaded page when someone else writes an entry.
 */
export const useResponseLog = (recordId: string, search: string, order: SortOrder) => {
  const { http } = useInvestigationsServices();

  return useInfiniteQuery(
    [...investigationKeys.activityAll(recordId), 'log', { search, order }],
    ({ pageParam = 1 }: { pageParam?: number }) =>
      findActivity(http, recordId, {
        per_page: PAGE_SIZE,
        sort_order: order,
        page: pageParam,
        ...(search.length > 0 ? { search } : {}),
      }),
    {
      enabled: recordId.length > 0,
      keepPreviousData: true,
      retry: false,
      getNextPageParam: (last) =>
        last.page * last.per_page < last.total ? last.page + 1 : undefined,
    }
  );
};

/**
 * Ids that appeared after the first load, for a brief highlight. Pass only ids that can be new
 * (entries newer than what was there at the start), so filtering does not flag old ones.
 */
export const useFreshIds = (isReady: boolean, ids: readonly string[]): ReadonlySet<string> => {
  const known = useRef<Set<string> | null>(null);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    if (!isReady) {
      return;
    }
    if (known.current === null) {
      known.current = new Set(ids);
      return;
    }
    const seen = known.current;
    const added = ids.filter((id) => !seen.has(id));
    if (added.length === 0) {
      return;
    }
    added.forEach((id) => seen.add(id));
    setFresh((current) => new Set([...current, ...added]));
    timers.current.push(
      setTimeout(() => {
        setFresh((current) => {
          const next = new Set(current);
          added.forEach((id) => next.delete(id));
          return next;
        });
      }, FRESH_MS)
    );
  }, [isReady, ids]);

  useEffect(() => {
    const pendingTimers = timers.current;
    return () => pendingTimers.forEach((timer) => clearTimeout(timer));
  }, []);

  return fresh;
};
