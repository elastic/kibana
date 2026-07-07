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
import type { GetRuleTagsParams, GetRuleTagsResponse } from '../apis/get_rule_tags';
import { getRuleTags } from '../apis/get_rule_tags';
import { queryKeys } from '../query_keys';

interface UseGetRuleTagsQueryParams extends SetOptional<GetRuleTagsParams, 'page'> {
  // Params
  refresh?: Date;
  enabled: boolean;

  // Services
  toasts: ToastsStart;
}

const EMPTY_TAGS: string[] = [];

export const getKey = queryKeys.getRuleTags;

// React query will refetch all prev pages when the cache keys change:
// https://github.com/TanStack/query/discussions/3576
export function useGetRuleTagsQuery({
  enabled,
  refresh,
  search,
  ruleTypeIds,
  perPage,
  page = 1,
  http,
  toasts,
}: UseGetRuleTagsQueryParams) {
  const queryFn = ({ pageParam }: { pageParam?: GetRuleTagsParams }) =>
    getRuleTags({
      http,
      perPage: pageParam?.perPage ?? perPage,
      page: pageParam?.page ?? page,
      search,
      ruleTypeIds,
    });

  const onErrorFn = () => {
    toasts.addDanger(
      i18n.translate('responseOpsRulesApis.unableToLoadRuleTags', {
        defaultMessage: 'Unable to load rule tags',
      })
    );
  };

  const getNextPageParam = (lastPage: GetRuleTagsResponse) => {
    const totalPages = Math.max(1, Math.ceil(lastPage.total / lastPage.perPage));
    if (totalPages === lastPage.page) {
      return;
    }
    return {
      ...lastPage,
      page: lastPage.page + 1,
    };
  };

  const {
    refetch,
    data,
    fetchNextPage,
    isLoading,
    isFetching,
    hasNextPage,
    isFetchingNextPage,
    isError,
  } = useInfiniteQuery({
    queryKey: getKey({
      ruleTypeIds,
      search,
      perPage,
      page,
      refresh,
    }),
    queryFn,
    onError: onErrorFn,
    enabled,
    getNextPageParam,
    refetchOnWindowFocus: false,
  });

  const tags = useMemo(() => {
    return (
      data?.pages.reduce<string[]>((result, current) => {
        return result.concat(current.data);
      }, []) || EMPTY_TAGS
    );
  }, [data]);

  return {
    tags,
    hasNextPage,
    refetch,
    isLoading: isLoading || isFetching || isFetchingNextPage,
    fetchNextPage,
    isError,
  };
}
