/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';

import { API_VERSIONS } from '../../common/constants';
import { useKibana } from '../common/lib/kibana';
import { useErrorToast } from '../common/hooks/use_error_toast';
import type { UnifiedHistoryResponse } from '../../common/api/unified_history/types';

const UNIFIED_HISTORY_QUERY_KEY = 'unifiedHistory';

interface UseUnifiedHistoryConfig {
  pageSize?: number;
  actionsCursor?: string;
  scheduledCursor?: string;
  scheduledOffset?: number;
  kuery?: string;
  sourceFilters?: string;
  skip?: boolean;
}

export const useUnifiedHistory = ({
  pageSize = 20,
  actionsCursor,
  scheduledCursor,
  scheduledOffset,
  kuery,
  sourceFilters,
  skip = false,
}: UseUnifiedHistoryConfig) => {
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();

  return useQuery<UnifiedHistoryResponse, Error>(
    [UNIFIED_HISTORY_QUERY_KEY, { pageSize, actionsCursor, scheduledCursor, scheduledOffset, kuery, sourceFilters }],
    () =>
      http.get<UnifiedHistoryResponse>('/internal/osquery/history', {
        version: API_VERSIONS.internal.v1,
        query: {
          pageSize,
          ...(kuery ? { kuery } : {}),
          ...(actionsCursor ? { actionsCursor } : {}),
          ...(scheduledCursor ? { scheduledCursor } : {}),
          ...(scheduledOffset != null ? { scheduledOffset } : {}),
          ...(sourceFilters ? { sourceFilters } : {}),
        },
      }),
    {
      enabled: !skip,
      keepPreviousData: true,
      onSuccess: () => setErrorToast(),
      onError: (error: Error) =>
        setErrorToast(error, {
          title: i18n.translate('xpack.osquery.unified_history.fetchError', {
            defaultMessage: 'Error while fetching query history',
          }),
        }),
      refetchOnWindowFocus: false,
    }
  );
};
