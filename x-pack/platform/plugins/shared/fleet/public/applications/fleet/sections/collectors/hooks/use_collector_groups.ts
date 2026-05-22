/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { useGetCollectorGroupsQuery } from '../../../../../hooks/use_request/agents';

import { useCollectorsUrlFilters, useSetCollectorsUrlFilters } from './use_url_filters';
import { useCollectorsSessionState } from './use_session_state';

interface UseCollectorGroupsOptions {
  groupBy: string;
  refetchInterval: number | false;
  enabled?: boolean;
}

export const useCollectorGroups = ({
  groupBy,
  refetchInterval,
  enabled = true,
}: UseCollectorGroupsOptions) => {
  const { kuery, groupPage, groupAfterKey: urlAfterKey } = useCollectorsUrlFilters();
  const setUrlFilters = useSetCollectorsUrlFilters();
  const { pageSize } = useCollectorsSessionState();

  const [afterKeys, setAfterKeys] = useState<Array<string | undefined>>(() => {
    const initial: Array<string | undefined> = [undefined];
    if (groupPage > 0 && urlAfterKey) {
      initial[groupPage] = urlAfterKey;
    }
    return initial;
  });

  const currentAfterKey = afterKeys[groupPage] ?? urlAfterKey;

  const prevKueryRef = useRef(kuery);
  useEffect(() => {
    if (prevKueryRef.current !== kuery) {
      prevKueryRef.current = kuery;
      setAfterKeys([undefined]);
      setUrlFilters({ groupPage: 0, groupAfterKey: undefined }, { replace: true });
    }
  }, [kuery, setUrlFilters]);

  const { data, isLoading, isInitialLoading, isError, error, dataUpdatedAt } =
    useGetCollectorGroupsQuery(
      {
        groupBy,
        kuery,
        perPage: pageSize,
        afterKey: currentAfterKey,
      },
      { enabled, refetchInterval, keepPreviousData: true }
    );

  const groups = data?.items ?? [];
  const nextAfterKey = data?.afterKey;

  const onNextPage = useCallback(() => {
    if (nextAfterKey) {
      const nextPage = groupPage + 1;
      setAfterKeys((prev) => {
        const next = [...prev];
        next[nextPage] = nextAfterKey;
        return next;
      });
      setUrlFilters(
        { groupPage: nextPage, groupAfterKey: nextAfterKey, expandedGroups: [] },
        { replace: true }
      );
    }
  }, [nextAfterKey, groupPage, setUrlFilters]);

  const onPreviousPage = useCallback(() => {
    const prevPage = Math.max(0, groupPage - 1);
    setUrlFilters(
      { groupPage: prevPage, groupAfterKey: afterKeys[prevPage], expandedGroups: [] },
      { replace: true }
    );
  }, [groupPage, afterKeys, setUrlFilters]);

  const resetPagination = useCallback(() => {
    setAfterKeys([undefined]);
    setUrlFilters({ groupPage: 0, groupAfterKey: undefined }, { replace: true });
  }, [setUrlFilters]);

  return {
    groups,
    isLoading,
    isInitialLoading,
    isError,
    error,
    dataUpdatedAt,
    pageIndex: groupPage,
    hasNextPage: !!nextAfterKey,
    onNextPage,
    onPreviousPage,
    resetPagination,
  };
};
