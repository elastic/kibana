/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import type { InspectResponse } from '../common/helpers';
import { useKibana } from '../common/lib/kibana';
import type { ResultEdges, Direction } from '../../common/search_strategy';
import { API_VERSIONS } from '../../common/constants';

import { useErrorToast } from '../common/hooks/use_error_toast';

export interface ActionResultsArgs {
  edges: ResultEdges;
  aggregations: {
    totalRowCount: number;
    totalResponded: number;
    successful: number;
    failed: number;
    pending: number;
  };
  inspect: InspectResponse;
}

export interface UseActionResults {
  actionId: string;
  activePage: number;
  startDate?: string;
  agentIds?: string[];
  direction: Direction;
  limit: number;
  sortField: string;
  kuery?: string;
  isLive?: boolean;
}

interface ActionResultsResponse {
  edges: ResultEdges;
  total: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  aggregations: {
    totalRowCount: number;
    totalResponded: number;
    successful: number;
    failed: number;
    pending: number;
  };
  inspect?: InspectResponse;
}

/**
 * Hook to fetch action results with hybrid pagination strategy.
 *
 * HYBRID PAGINATION APPROACH:
 * - Server attempts to fetch agent IDs from action document (preferred)
 * - If document unavailable, client provides current page agent IDs as fallback
 * - Client sends ONLY current page IDs (20-100 agents) to avoid URL length issues
 * - Client handles pagination UI using its full agentIds array
 *
 * This approach handles scenarios where action documents may be missing
 */
export const useActionResults = ({
  actionId,
  activePage,
  agentIds,
  direction,
  limit,
  sortField,
  kuery,
  startDate,
  isLive = false,
}: UseActionResults) => {
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();

  return useQuery<ActionResultsResponse, Error, ActionResultsArgs>(
    ['actionResults', { actionId, activePage, limit, direction, sortField }],
    () => {
      // Calculate current page agent IDs for fallback (maintains server-side pagination)
      // Only send ~20-100 IDs per page, NOT all agents (avoids URL length issues)
      const startIndex = activePage * limit;
      const endIndex = startIndex + limit;
      const currentPageAgentIds = agentIds?.slice(startIndex, endIndex) || [];

      return http.get<ActionResultsResponse>(`/api/osquery/action_results/${actionId}`, {
        version: API_VERSIONS.public.v1,
        query: {
          page: activePage,
          pageSize: limit,
          sort: sortField,
          sortOrder: direction,
          ...(kuery && { kuery }),
          ...(startDate && { startDate }),
          // Send current page agent IDs as fallback when action document missing
          // This maintains server-side pagination (only ~20 IDs sent, not all agents)
          // Client handles overall pagination using full agentIds array
          ...(currentPageAgentIds.length > 0 && {
            agentIds: currentPageAgentIds.join(','),
          }),
        },
      });
    },
    {
      select: (response) => ({
        edges: response.edges,
        aggregations: response.aggregations,
        inspect: response.inspect || { dsl: [], response: [] },
      }),
      initialData: {
        edges: [],
        total: 0,
        currentPage: 0,
        pageSize: limit,
        totalPages: 0,
        aggregations: {
          totalRowCount: 0,
          totalResponded: 0,
          successful: 0,
          pending: agentIds?.length ?? 0,
          failed: 0,
        },
        inspect: { dsl: [], response: [] },
      },
      refetchInterval: isLive ? 5000 : false,
      keepPreviousData: true,
      enabled: !!actionId && !!agentIds?.length,
      onSuccess: () => setErrorToast(),
      onError: (error) =>
        setErrorToast(error, {
          title: i18n.translate('xpack.osquery.action_results.fetchError', {
            defaultMessage: 'Error while fetching action results',
          }),
        }),
    }
  );
};
