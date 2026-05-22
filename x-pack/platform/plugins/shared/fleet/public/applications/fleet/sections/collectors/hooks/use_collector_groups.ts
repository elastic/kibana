/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { useGetCollectorGroupsQuery } from '../../../../../hooks/use_request/agents';

import { useCollectorsUrlFilters } from './use_url_filters';
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
  const { kuery } = useCollectorsUrlFilters();
  const { pageSize } = useCollectorsSessionState();

  const [afterKeys, setAfterKeys] = useState<Array<string | undefined>>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);

  const prevKueryRef = useRef(kuery);
  useEffect(() => {
    if (prevKueryRef.current !== kuery) {
      prevKueryRef.current = kuery;
      setAfterKeys([undefined]);
      setPageIndex(0);
    }
  }, [kuery]);

  const currentAfterKey = afterKeys[pageIndex];

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
      setAfterKeys((prev) => {
        const next = [...prev];
        next[pageIndex + 1] = nextAfterKey;
        return next;
      });
      setPageIndex((prev) => prev + 1);
    }
  }, [nextAfterKey, pageIndex]);

  const onPreviousPage = useCallback(() => {
    setPageIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const resetPagination = useCallback(() => {
    setAfterKeys([undefined]);
    setPageIndex(0);
  }, []);

  return {
    groups,
    isLoading,
    isInitialLoading,
    isError,
    error,
    dataUpdatedAt,
    pageIndex,
    hasNextPage: !!nextAfterKey,
    onNextPage,
    onPreviousPage,
    resetPagination,
  };
};
