/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useService } from '@kbn/core-di-browser';
import { useQuery } from '@kbn/react-query';
import { useDebouncedValue } from '@kbn/react-hooks';
import { ActionPoliciesApi } from '../services/action_policies_api';
import { matcherSuggestionKeys } from './query_key_factory';

export const useFetchDataFields = (matcher?: string) => {
  const actionPoliciesApi = useService(ActionPoliciesApi);
  const trimmed = matcher?.trim() || undefined;
  const debouncedMatcher = useDebouncedValue(trimmed, 300);

  return useQuery<string[], Error>({
    queryKey: matcherSuggestionKeys.dataFields(debouncedMatcher),
    queryFn: () => actionPoliciesApi.fetchDataFields(debouncedMatcher),
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000, // 30 seconds
  });
};
