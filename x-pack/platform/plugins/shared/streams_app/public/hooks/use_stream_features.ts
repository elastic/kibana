/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { Feature, Streams } from '@kbn/streams-schema';
import type { QueryFunctionContext } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import { useFetchErrorToast } from './use_fetch_error_toast';
import { useKibana } from './use_kibana';

export const useStreamFeatures = (definition: Streams.all.Definition) => {
  const { streamsRepositoryClient } = useKibana().dependencies.start.streams;
  const showFetchErrorToast = useFetchErrorToast();

  const streamName = definition.name;

  const fetchFeatures = async ({ signal: querySignal }: QueryFunctionContext) => {
    return streamsRepositoryClient.fetch('GET /internal/streams/{name}/features', {
      params: {
        path: {
          name: streamName,
        },
      },
      signal: querySignal ?? null,
    });
  };

  const { data, isLoading, error, refetch } = useQuery<{ features: Feature[] }, Error>({
    queryKey: ['features', streamName],
    queryFn: fetchFeatures,
    onError: showFetchErrorToast,
  });

  const features = useMemo(() => data?.features ?? [], [data?.features]);

  return {
    features,
    featuresLoading: isLoading,
    refreshFeatures: refetch,
    error,
  };
};
