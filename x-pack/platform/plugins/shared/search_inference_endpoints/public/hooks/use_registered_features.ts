/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useMemo } from 'react';
import type { InferenceFeatureResponse } from '../../common/types';
import { APIRoutes } from '../../common/types';
import { INFERENCE_FEATURES_QUERY_KEY, ROUTE_VERSIONS } from '../../common/constants';
import { useKibana } from './use_kibana';

/**
 * Returns registered inference features from GET /internal/search_inference_endpoints/features.
 * The hook signature matches InferenceFeatureConfig for backward compatibility with consumers.
 */
export const useRegisteredFeatures = (): {
  features: InferenceFeatureResponse[];
  isLoading: boolean;
} => {
  const { services } = useKibana();

  const { data, isLoading } = useQuery({
    queryKey: [INFERENCE_FEATURES_QUERY_KEY],
    queryFn: async () =>
      services.http.get<{ features: InferenceFeatureResponse[] }>(
        APIRoutes.GET_INFERENCE_FEATURES,
        { version: ROUTE_VERSIONS.v1 }
      ),
  });
  // this prevents excessive re-renders in consuming components that use the features array as a dependency
  // by extracting features from useQuery we lose the useQuery API's caching and memoization
  const features = useMemo(() => data?.features ?? [], [data?.features]);

  return {
    features,
    isLoading,
  };
};
