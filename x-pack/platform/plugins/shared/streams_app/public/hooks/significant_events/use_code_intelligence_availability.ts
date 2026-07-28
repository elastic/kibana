/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryFunctionContext } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '../use_kibana';

/**
 * Reports whether any Semantic Code Search `code-*` index exists in the cluster.
 * When `false`, the Code Intelligence UI shows an onboarding placeholder instead
 * of the code features.
 */
export const useCodeIntelligenceAvailability = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const { streamsRepositoryClient } = useKibana().dependencies.start.streams;

  const { data, isLoading } = useQuery<{ available: boolean }, Error>({
    queryKey: ['code-intelligence-availability'],
    queryFn: async ({ signal }: QueryFunctionContext) =>
      streamsRepositoryClient.fetch('GET /internal/streams/code_intelligence/_availability', {
        signal: signal ?? null,
      }),
    enabled,
  });

  return { available: data?.available ?? false, isLoading };
};
