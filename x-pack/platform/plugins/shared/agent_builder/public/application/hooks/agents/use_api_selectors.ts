/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { ApiTarget } from '@kbn/agent-builder-common';
import { queryKeys } from '../../query_keys';

export type ApiSelectorsByTarget = Record<ApiTarget, readonly string[]>;

const loadApiSelectors = async (): Promise<ApiSelectorsByTarget> => {
  const { apiSelectorsByTarget } = await import('@kbn/agent-builder-common/apis/known_apis');
  return apiSelectorsByTarget;
};

export const useApiSelectors = (): {
  selectorsByTarget: ApiSelectorsByTarget | undefined;
  isLoading: boolean;
} => {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.apiSelectors,
    queryFn: loadApiSelectors,
    staleTime: Infinity,
    cacheTime: Infinity,
  });
  return { selectorsByTarget: data, isLoading };
};
