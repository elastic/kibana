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
import { useCollectorsSessionState } from './use_session_state';

interface UseCollectorsListOptions {
  refetchInterval: number | false;
  enabled?: boolean;
}

export const useCollectorsList = ({
  refetchInterval,
  enabled = true,
}: UseCollectorsListOptions) => {
  const { kuery: userKuery, pageIndex } = useCollectorsUrlFilters();
  const setUrlFilters = useSetCollectorsUrlFilters();
  const { pageSize, setPageSize } = useCollectorsSessionState();

  const baseKuery = `type:${AGENT_TYPE_OPAMP}`;
  const kuery = userKuery ? `${baseKuery} AND (${userKuery})` : baseKuery;

  const { data, isLoading, isInitialLoading, isError, error, dataUpdatedAt } = useGetAgentsQuery(
    { kuery, page: pageIndex + 1, perPage: pageSize, showInactive: false },
    { enabled, refetchInterval, keepPreviousData: true }
  );

  const onTableChange = useCallback(
    (criteria: CriteriaWithPagination<Agent>) => {
      setUrlFilters({ pageIndex: criteria.page.index }, { replace: true });
      setPageSize(criteria.page.size);
    },
    [setUrlFilters, setPageSize]
  );

  const setSearchQuery = useCallback(
    (value: string | undefined) => setUrlFilters({ kuery: value, pageIndex: 0 }),
    [setUrlFilters]
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
    searchQuery: userKuery,
    setSearchQuery,
    onTableChange,
  };
};
