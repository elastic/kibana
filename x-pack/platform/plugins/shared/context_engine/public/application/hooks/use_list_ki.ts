/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import { useEffect } from 'react';
import { DEFAULT_KI_PAGE_SIZE } from '../../../common/constants';
import type { KiStatus } from '../../../common/ki_lifecycle_status';
import type { KiListSort } from '../../../common/ki_list_sort';
import type { KiTypeCount } from '../../../common/http_api/ai_indices';
import type { ListKisResponse } from '../../../common/http_api/knowledge_indicators';
import { listKis } from '../api/knowledge_indicators';
import { getErrorMessage } from '../utils/get_error_message';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

interface UseListKiArgs {
  aiIndexId: string | undefined;
  size?: number;
  type?: string;
  /** Leaves out these types (KIs without a type stay in). Used by the "Other" section. */
  excludeTypes?: readonly string[];
  query?: string;
  status?: readonly KiStatus[];
  sort?: KiListSort;
  enabled?: boolean;
  notifyOnError?: boolean;
}

export interface KiListSummary {
  total: number;
  countsByType: KiTypeCount[];
}

interface UseListKiResult {
  kis: ListKisResponse['kis'];
  total: number;
  summary: KiListSummary;
  isLoading: boolean;
  isFetching: boolean;
  /** The shown data belongs to the previous filters while the new request runs. */
  isPreviousData: boolean;
  error: Error | undefined;
  refetch: () => void;
}

export const useListKi = ({
  aiIndexId,
  size = DEFAULT_KI_PAGE_SIZE,
  type,
  excludeTypes,
  query,
  status,
  sort,
  enabled = true,
  notifyOnError = false,
}: UseListKiArgs): UseListKiResult => {
  const {
    services: { http, notifications },
  } = useKibana();

  const { data, isLoading, isFetching, isPreviousData, error, refetch } = useQuery<
    ListKisResponse,
    Error
  >({
    queryKey: contextEngineQueryKeys.aiIndex.listKi(
      aiIndexId ?? '',
      size,
      type,
      query,
      status,
      sort,
      excludeTypes
    ),
    queryFn: ({ signal }) => {
      if (!aiIndexId) {
        throw new Error('AI index id is required');
      }
      return listKis(http, {
        aiIndexId,
        size,
        ...(type !== undefined ? { type } : {}),
        ...(excludeTypes !== undefined ? { excludeTypes: [...excludeTypes] } : {}),
        ...(query !== undefined ? { query } : {}),
        ...(status !== undefined ? { status: [...status] } : {}),
        ...(sort !== undefined ? { sort } : {}),
        signal,
      });
    },
    enabled: enabled && aiIndexId !== undefined,
    keepPreviousData: true,
  });

  useEffect(() => {
    if (!notifyOnError || isLoading || !error) {
      return;
    }

    const toastMessage = getErrorMessage(error);
    notifications.toasts.addError(error, {
      title: i18n.translate('xpack.contextEngine.listKi.loadErrorTitle', {
        defaultMessage: 'Unable to load Knowledge documents',
      }),
      ...(toastMessage ? { toastMessage } : {}),
    });
  }, [error, isLoading, notifyOnError, notifications]);

  return {
    kis: data?.kis ?? [],
    total: data?.total ?? 0,
    summary: {
      total: data?.summary?.total ?? data?.total ?? 0,
      countsByType: data?.summary?.counts_by_type ?? [],
    },
    isLoading,
    isFetching,
    isPreviousData,
    error: error ?? undefined,
    refetch,
  };
};
