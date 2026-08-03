/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { ListPatternsResponse } from '../../../common/http_api/patterns';
import { listPatterns } from '../api/patterns';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

/**
 * Lists the failure patterns detected for an AI index. Only fetches when the
 * index has self-improvement enabled.
 */
export const usePatterns = (aiIndexId: string, enabled: boolean) => {
  const {
    services: { http },
  } = useKibana();

  const { data, isLoading, error, refetch } = useQuery<ListPatternsResponse, Error>({
    queryKey: contextEngineQueryKeys.patterns.list(aiIndexId),
    queryFn: ({ signal }) => listPatterns(http, { aiIndexId, signal }),
    enabled,
  });

  return { patterns: data?.patterns ?? [], isLoading, error: error ?? undefined, refetch };
};
