/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceConnector } from '@kbn/inference-common';
import {
  INFERENCE_CONNECTORS_INTERNAL_API_PATH,
  type InferenceConnectorsApiResponseBody,
} from '@kbn/inference-common';
import { useAbortController } from '@kbn/react-hooks';
import useAsync from 'react-use/lib/useAsync';
import { useKibana } from '../use_kibana';

export interface UseInferenceFeatureConnectorsResult {
  resolvedConnector: InferenceConnector | undefined;
  allConnectors: InferenceConnector[];
  loading: boolean;
  error: Error | undefined;
}

export function useInferenceFeatureConnectors(
  featureId: string
): UseInferenceFeatureConnectorsResult {
  const { core } = useKibana();
  const { signal } = useAbortController();

  const state = useAsync(
    () =>
      core.http.get<InferenceConnectorsApiResponseBody>(INFERENCE_CONNECTORS_INTERNAL_API_PATH, {
        query: { featureId },
        version: '1',
        signal,
      }),
    [core.http, featureId, signal]
  );

  return {
    // The API returns the feature-matched connector as the first element of `connectors`
    resolvedConnector: state.value?.connectors[0],
    allConnectors: state.value?.allConnectors ?? [],
    loading: state.loading,
    error: state.error,
  };
}
