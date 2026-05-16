/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureHistoryEntry } from '@kbn/streams-schema';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '../use_kibana';

export const useFeatureHistory = ({
  streamName,
  featureId,
  enabled,
}: {
  streamName: string;
  featureId: string;
  enabled: boolean;
}) => {
  const { streamsRepositoryClient } = useKibana().dependencies.start.streams;
  return useQuery<{ entries: FeatureHistoryEntry[] }, Error>({
    queryKey: ['feature-history', streamName, featureId],
    queryFn: ({ signal }) =>
      streamsRepositoryClient.fetch('GET /internal/streams/{name}/features/_history', {
        params: { path: { name: streamName }, query: { id: featureId } },
        signal: signal ?? null,
      }),
    enabled,
    staleTime: 30_000,
  });
};
