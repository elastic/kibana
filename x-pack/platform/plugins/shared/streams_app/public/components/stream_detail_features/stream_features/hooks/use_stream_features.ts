/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature } from '@kbn/streams-schema';
import { useMemo } from 'react';
import type { QueryFunctionContext } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import { useFetchErrorToast } from '../../../../hooks/use_fetch_error_toast';
import { useKibana } from '../../../../hooks/use_kibana';

export const useStreamFeatures = (streamName: string) => {
  const { streamsRepositoryClient } = useKibana().dependencies.start.streams;
  const showFetchErrorToast = useFetchErrorToast();

  const fetchFeatures = async ({ signal }: QueryFunctionContext) => {
    return streamsRepositoryClient.fetch('GET /internal/streams/{name}/features', {
      params: {
        path: {
          name: streamName,
        },
      },
      signal: signal ?? null,
    });
  };

  const { data, isLoading, error, refetch } = useQuery<{ features: Feature[] }, Error>({
    queryKey: ['features', streamName],
    queryFn: fetchFeatures,
    onError: showFetchErrorToast,
  });

  const features = useMemo(() => data?.features ?? [], [data?.features]);

  const featuresByName = useMemo(
    () => Object.fromEntries(features.map((f) => [f.name, f])),
    [features]
  );

  return {
    refreshFeatures: refetch,
    features,
    featuresByName,
    featuresLoading: isLoading,
    error,
  };
};
