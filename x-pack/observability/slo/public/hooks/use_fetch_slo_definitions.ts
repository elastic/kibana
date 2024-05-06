/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FindSLODefinitionsResponse } from '@kbn/slo-schema';
import { useQuery } from '@tanstack/react-query';
import { useKibana } from '../utils/kibana_react';
import { sloKeys } from './query_key_factory';

export interface UseFetchSloDefinitionsResponse {
  data: FindSLODefinitionsResponse | undefined;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  refetch: () => void;
}

interface Params {
  name?: string;
  includeOutdatedOnly?: boolean;
  page?: number;
  perPage?: number;
}

export function useFetchSloDefinitions({
  name = '',
  includeOutdatedOnly = false,
  page = 1,
  perPage = 100,
}: Params): UseFetchSloDefinitionsResponse {
  const { http } = useKibana().services;
  const search = name.endsWith('*') ? name : `${name}*`;

  const { isLoading, isError, isSuccess, data, refetch } = useQuery({
    queryKey: sloKeys.definitions(search, page, perPage, includeOutdatedOnly),
    queryFn: async ({ signal }) => {
      try {
        const response = await http.get<FindSLODefinitionsResponse>(
          '/api/observability/slos/_definitions',
          { query: { search, includeOutdatedOnly, page, perPage }, signal }
        );

        return response;
      } catch (error) {
        throw new Error(`Something went wrong. Error: ${error}`);
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  return { isLoading, isError, isSuccess, data, refetch };
}
