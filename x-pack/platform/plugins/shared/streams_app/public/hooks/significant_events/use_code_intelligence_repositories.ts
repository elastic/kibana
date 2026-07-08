/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryFunctionContext } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '../use_kibana';
import { useFetchErrorToast } from '../use_fetch_error_toast';

export interface CodeIntelligenceRepositoryRow {
  repository: string;
  indexed: boolean;
  repo_type?: string;
  language?: string;
  service_name?: string;
  service_predicted?: boolean;
  stream_name?: string;
}

/**
 * Fetches the cross-stream Code Intelligence repositories overview: SCS-indexed
 * repositories joined with the code features (repo type, language, service name)
 * derived from them.
 */
export const useCodeIntelligenceRepositories = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const { streamsRepositoryClient } = useKibana().dependencies.start.streams;
  const showFetchErrorToast = useFetchErrorToast();

  const { data, isLoading, refetch } = useQuery<
    { repositories: CodeIntelligenceRepositoryRow[] },
    Error
  >({
    queryKey: ['code-intelligence-repositories'],
    queryFn: async ({ signal }: QueryFunctionContext) =>
      streamsRepositoryClient.fetch('GET /internal/streams/code_intelligence/_repositories', {
        signal: signal ?? null,
      }),
    onError: showFetchErrorToast,
    enabled,
  });

  return { repositories: data?.repositories ?? [], isLoading, refetch };
};
