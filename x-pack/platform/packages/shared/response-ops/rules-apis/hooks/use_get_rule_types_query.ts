/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { UseQueryOptions } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import { getRuleTypes } from '../apis/get_rule_types';
import { queryKeys } from '../query_keys';

export interface GetRuleTypesQueryParams {
  http: HttpStart;
}

export const getKey = queryKeys.getRuleTypes;

export const useGetRuleTypesQuery = (
  { http }: GetRuleTypesQueryParams,
  {
    onError,
    enabled,
    context,
  }: Pick<UseQueryOptions<typeof getRuleTypes>, 'onError' | 'enabled' | 'context'>
) => {
  return useQuery({
    queryKey: getKey(),
    queryFn: () => getRuleTypes({ http }),
    refetchOnWindowFocus: false,
    // Leveraging TanStack Query's caching system to avoid duplicated requests as
    // other state-sharing solutions turned out to be overly complex and less readable
    staleTime: 60 * 1000,
    onError,
    enabled,
    context,
  });
};
