/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type QueryFunctionContext, useQuery } from '@kbn/react-query';
import { useKibana } from '../use_kibana';

interface FetchCodeIndicesResult {
  indices: string[];
}

/**
 * Fetches the Semantic Code Search indices (code-*) a stream can be linked to.
 * Disabled until `enabled` is true so the list is only loaded when the linked
 * code index popover is opened.
 */
export const useFetchCodeIndices = ({ enabled }: { enabled: boolean }) => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  return useQuery<FetchCodeIndicesResult, Error>({
    queryKey: ['significantEvents', 'codeIndices'],
    enabled,
    queryFn: async ({ signal }: QueryFunctionContext) =>
      streamsRepositoryClient.fetch('GET /internal/streams/_significant_events/code_indices', {
        signal: signal ?? null,
        params: {},
      }),
  });
};
