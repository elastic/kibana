/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { queryKeys } from '../../query_keys';
import { useAgentBuilderServices } from '../use_agent_builder_service';

export interface UsePromptsParams {
  query?: string;
  page?: number;
  per_page?: number;
}

export const usePrompts = (params: UsePromptsParams = {}) => {
  const { promptsService } = useAgentBuilderServices();

  const { query, page = 1, per_page = 20 } = params;

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.prompts.find({ query, page, per_page }),
    queryFn: () => promptsService.find({ query, page, per_page }),
  });

  return {
    prompts: data?.data ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? page,
    perPage: data?.per_page ?? per_page,
    isLoading,
    error,
  };
};
