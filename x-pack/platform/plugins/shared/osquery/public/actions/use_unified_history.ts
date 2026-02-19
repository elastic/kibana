/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { API_VERSIONS } from '../../common/constants';
import { useKibana } from '../common/lib/kibana';
import { useErrorToast } from '../common/hooks/use_error_toast';
import type { UnifiedHistoryRow } from '../../common/search_strategy/osquery/unified_history';

interface UnifiedHistoryResponse {
  rows: UnifiedHistoryRow[];
  total: number;
  nextCursor?: string;
}

interface UseUnifiedHistoryConfig {
  pageSize?: number;
  kuery?: string;
}

const UNIFIED_HISTORY_QUERY_KEY = 'unifiedHistory';

export const useUnifiedHistory = ({
  pageSize = 20,
  kuery,
}: UseUnifiedHistoryConfig) => {
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();
  const [cursorStack, setCursorStack] = useState<Array<string | undefined>>([undefined]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const currentCursor = cursorStack[currentPageIndex];

  const { data, isLoading, isFetching } = useQuery<UnifiedHistoryResponse, Error>(
    [UNIFIED_HISTORY_QUERY_KEY, { pageSize, cursor: currentCursor, kuery }],
    () =>
      http.get<UnifiedHistoryResponse>('/internal/osquery/history', {
        version: API_VERSIONS.internal.v1,
        query: {
          pageSize,
          ...(currentCursor ? { cursor: currentCursor } : {}),
          ...(kuery ? { kuery } : {}),
        },
      }),
    {
      keepPreviousData: true,
      onSuccess: () => setErrorToast(),
      onError: (error) =>
        setErrorToast(error, {
          title: i18n.translate('xpack.osquery.unifiedHistory.fetchError', {
            defaultMessage: 'Error while fetching history',
          }),
        }),
    }
  );

  const handleNextPage = useCallback(() => {
    if (data?.nextCursor) {
      setCursorStack((prev) => {
        const next = [...prev];
        next[currentPageIndex + 1] = data.nextCursor;

        return next;
      });
      setCurrentPageIndex((prev) => prev + 1);
    }
  }, [currentPageIndex, data?.nextCursor]);

  const handlePrevPage = useCallback(() => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex((prev) => prev - 1);
    }
  }, [currentPageIndex]);

  const pagination = useMemo(
    () => ({
      currentPageIndex,
      hasNextPage: !!data?.nextCursor,
      hasPrevPage: currentPageIndex > 0,
      onNextPage: handleNextPage,
      onPrevPage: handlePrevPage,
    }),
    [currentPageIndex, data?.nextCursor, handleNextPage, handlePrevPage]
  );

  return {
    data,
    isLoading,
    isFetching,
    pagination,
  };
};
