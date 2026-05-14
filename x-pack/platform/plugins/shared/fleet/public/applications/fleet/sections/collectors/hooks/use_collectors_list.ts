/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { CriteriaWithPagination } from '@elastic/eui';

import { AGENT_TYPE_OPAMP } from '../../../../../../common/constants';
import type { Agent } from '../../../../../../common/types';
import { useGetAgentsQuery } from '../../../../../hooks/use_request/agents';

import { useCollectorsUrlFilters, useSetCollectorsUrlFilters } from './use_url_filters';

interface UseCollectorsListOptions {
  refetchInterval: number | false;
}

export const useCollectorsList = ({ refetchInterval }: UseCollectorsListOptions) => {
  const { q, pageIndex, pageSize } = useCollectorsUrlFilters();
  const setFilters = useSetCollectorsUrlFilters();

  const kuery = q ? `type:${AGENT_TYPE_OPAMP} AND (${q})` : `type:${AGENT_TYPE_OPAMP}`;

  const { data, isLoading, isInitialLoading, isError, error, dataUpdatedAt } = useGetAgentsQuery(
    { kuery, page: pageIndex + 1, perPage: pageSize, showInactive: false },
    { refetchInterval, keepPreviousData: true }
  );

  const onTableChange = useCallback(
    (criteria: CriteriaWithPagination<Agent>) => {
      setFilters(
        { pageIndex: criteria.page.index, pageSize: criteria.page.size },
        { replace: true }
      );
    },
    [setFilters]
  );

  const setSearchQuery = useCallback(
    (value: string | undefined) => setFilters({ q: value, pageIndex: 0 }),
    [setFilters]
  );

  return {
    collectors: data?.data?.items ?? [],
    totalCount: data?.data?.total ?? 0,
    isLoading,
    isInitialLoading,
    isError,
    error,
    dataUpdatedAt,
    pageIndex,
    pageSize,
    searchQuery: q,
    setSearchQuery,
    onTableChange,
  };
};
