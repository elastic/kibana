/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useInfiniteQuery } from '@kbn/react-query';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import type { SetOptional } from 'type-fest';
import type {
  FindRuleTemplatesParams,
  FindRuleTemplatesResponse,
} from '../apis/find_rule_templates';
import { findRuleTemplates } from '../apis/find_rule_templates';

export interface UseFindTemplatesQueryParams extends SetOptional<FindRuleTemplatesParams, 'page'> {
  enabled?: boolean;
  refresh?: Date;
  toasts: ToastsStart;
}

export const getKey = (
  params: Omit<UseFindTemplatesQueryParams, 'http' | 'toasts' | 'enabled'>
) => ['ruleTemplates', params];

export const useFindTemplatesQuery = ({
  http,
  toasts,
  enabled,
  refresh,
  page = 1,
  perPage,
  sortField,
  sortOrder,
  search,
  defaultSearchOperator,
  ruleTypeId,
  tags,
}: UseFindTemplatesQueryParams) => {
  const queryFn = async ({ pageParam }: { pageParam?: FindRuleTemplatesParams }) => {
    const response = await findRuleTemplates({
      http,
      page: pageParam?.page ?? page,
      perPage: pageParam?.perPage ?? perPage,
      sortField,
      sortOrder,
      search,
      defaultSearchOperator,
      ruleTypeId,
      tags,
    });

    return response;
  };

  const onErrorFn = (error: Error) => {
    toasts.addDanger({
      title: i18n.translate('responseOpsRulesApis.unableToLoadTemplates', {
        defaultMessage: 'Unable to load rule templates',
      }),
      text: error.message,
    });
  };

  const getNextPageParam = (lastPage: FindRuleTemplatesResponse) => {
    const loadedCount = lastPage.page * lastPage.perPage;
    if (loadedCount >= lastPage.total) {
      return undefined;
    }
    return {
      perPage: lastPage.perPage,
      page: lastPage.page + 1,
    };
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    refetch,
    isError,
  } = useInfiniteQuery({
    queryKey: getKey({
      search,
      perPage,
      sortField,
      sortOrder,
      refresh,
      page,
      defaultSearchOperator,
      ruleTypeId,
      tags,
    }),
    queryFn,
    onError: onErrorFn,
    getNextPageParam,
    enabled,
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
  });

  const templates = useMemo(() => {
    return data?.pages.flatMap((it) => it.data) ?? [];
  }, [data]);

  return {
    templates,
    totalTemplates: data?.pages[0]?.total ?? 0,
    hasNextPage,
    refetch,
    fetchNextPage,
    isLoading,
    isFetching,
    isFetchingNextPage,
    isError,
  };
};
