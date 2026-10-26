/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { HttpStart } from '@kbn/core-http-browser';
import type { EpisodeDataSource } from '../types/episode_data_source';
import { toConditionFieldNames } from '../utils/to_condition_field_names';
import { queryKeys } from '../query_keys';

export type ConditionFieldsSource = Pick<EpisodeDataSource, 'id' | 'fetchSearchFields'>;

export interface UseConditionFieldNamesOptions {
  http: HttpStart;
  dataSource?: ConditionFieldsSource;
  ruleTypeIds?: string[];
  enabled?: boolean;
}

export interface UseConditionFieldNamesResult {
  fieldNames: string[];
  isLoading: boolean;
}

export const useConditionFieldNames = ({
  http,
  dataSource,
  ruleTypeIds,
  enabled = true,
}: UseConditionFieldNamesOptions): UseConditionFieldNamesResult => {
  const fetchSearchFields = dataSource?.fetchSearchFields;

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.conditionFieldNames(dataSource?.id ?? '', ruleTypeIds ?? []),
    queryFn: ({ signal }) =>
      fetchSearchFields!({ services: { http }, abortSignal: signal, ruleTypeIds }).then(
        toConditionFieldNames
      ),
    enabled: enabled && fetchSearchFields != null,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  return { fieldNames: data ?? [], isLoading: fetchSearchFields != null && isLoading };
};
