/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';

import { i18n } from '@kbn/i18n';
import { useKibana } from '../common/lib/kibana';
import type { ResultEdges, Direction, ResultsStrategyResponse } from '../../common/search_strategy';
import { API_VERSIONS } from '../../common/constants';

import { useErrorToast } from '../common/hooks/use_error_toast';

interface ResultsArgs {
  edges: ResultEdges;
  id: string;
  total: number;
  columns: string[];
}

interface UseAllResults {
  actionId: string;
  liveQueryActionId?: string;
  activePage: number;
  startDate?: string;
  limit: number;
  sort: Array<{ field: string; direction: Direction }>;
  kuery?: string;
  isLive?: boolean;
}

export const useAllResults = ({
  actionId,
  liveQueryActionId,
  activePage,
  startDate,
  limit,
  sort,
  kuery,
  isLive = false,
}: UseAllResults) => {
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();

  return useQuery<{ data: ResultsStrategyResponse }, Error, ResultsArgs>(
    ['allActionResults', { actionId, liveQueryActionId, activePage, limit, sort }],
    () =>
      http.get<{ data: ResultsStrategyResponse }>(
        `/api/osquery/live_queries/${liveQueryActionId}/results/${actionId}`,
        {
          version: API_VERSIONS.public.v1,
          query: {
            page: activePage,
            pageSize: limit,
            ...(sort.length > 0 && {
              sort: sort[0].field,
              sortOrder: sort[0].direction,
            }),
            ...(kuery && { kuery }),
            ...(startDate && { startDate }),
          },
        }
      ),
    {
      select: (response) => ({
        id: actionId,
        total: response.data.total ?? 0,
        edges: response.data.edges ?? [],
        columns: Object.keys(
          (response.data.edges?.length && response.data.edges[0].fields) || {}
        ).sort(),
      }),
      keepPreviousData: true,
      refetchInterval: isLive ? 5000 : false,
      onSuccess: () => setErrorToast(),
      onError: (error: Error) =>
        setErrorToast(error, {
          title: i18n.translate('xpack.osquery.live_query_results.fetchError', {
            defaultMessage: 'Error while fetching live query results',
          }),
        }),
    }
  );
};
