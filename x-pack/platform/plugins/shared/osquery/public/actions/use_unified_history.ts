/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useCallback, useRef } from 'react';
import { API_VERSIONS } from '../../common/constants';
import type { UnifiedHistoryResponse, SourceFilter } from '../../common/api/unified_history/types';
import { useKibana } from '../common/lib/kibana';
import { useErrorToast } from '../common/hooks/use_error_toast';

export interface UseUnifiedHistoryConfig {
  pageSize: number;
  nextPage?: string;
  kuery?: string;
  sourceFilters?: SourceFilter[];
  userIds?: string[];
  tags?: string[];
  startDate?: string;
  endDate?: string;
  sortDirection?: 'asc' | 'desc';
  enabled?: boolean;
}

const UNIFIED_HISTORY_QUERY_KEY = 'unifiedHistory';

const FETCH_ERROR_TITLE = i18n.translate('xpack.osquery.unifiedHistory.fetchError', {
  defaultMessage: 'Error while fetching query history',
});

export const useUnifiedHistory = ({
  pageSize,
  nextPage,
  kuery,
  sourceFilters,
  userIds,
  tags,
  startDate,
  endDate,
  sortDirection = 'desc',
  enabled = true,
}: UseUnifiedHistoryConfig) => {
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();
  const errorToastRef = useRef(setErrorToast);
  errorToastRef.current = setErrorToast;

  const onSuccess = useCallback(() => errorToastRef.current(), []);
  const onError = useCallback(
    (error: unknown) => errorToastRef.current(error, { title: FETCH_ERROR_TITLE }),
    []
  );

  return useQuery(
    [
      UNIFIED_HISTORY_QUERY_KEY,
      {
        pageSize,
        nextPage,
        kuery,
        sourceFilters,
        userIds,
        tags,
        startDate,
        endDate,
        sortDirection,
      },
    ],
    () =>
      http.get<UnifiedHistoryResponse>('/api/osquery/history', {
        version: API_VERSIONS.public.v1,
        query: {
          pageSize,
          ...(nextPage ? { nextPage } : {}),
          ...(kuery ? { kuery } : {}),
          ...(sourceFilters && sourceFilters.length > 0
            ? { sourceFilters: sourceFilters.join(',') }
            : {}),
          ...(userIds && userIds.length > 0 ? { userIds: userIds.join(',') } : {}),
          // JSON.stringify instead of join(',') because tag values themselves may contain commas
          ...(tags && tags.length > 0 ? { tags: JSON.stringify(tags) } : {}),
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {}),
          ...(sortDirection !== 'desc' ? { sortDirection } : {}),
        },
      }),
    {
      keepPreviousData: true,
      enabled,
      onSuccess,
      onError,
    }
  );
};
