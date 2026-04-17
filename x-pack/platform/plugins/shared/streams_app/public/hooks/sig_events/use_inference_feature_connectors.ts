/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import {
  INFERENCE_CONNECTORS_INTERNAL_API_PATH,
  type InferenceConnectorsApiResponseBody,
} from '@kbn/inference-common';
import { useKibana } from '../use_kibana';

const NO_DEFAULT_CONNECTOR = 'NO_DEFAULT_CONNECTOR';

export interface UseInferenceFeatureConnectorsResult {
  resolvedConnectorId: string | undefined;
  loading: boolean;
  error: Error | undefined;
}

/**
 * Resolves the connector to use for a given inference feature by calling
 * the search_inference_endpoints API directly. This bypasses the
 * default-prepending logic in useLoadConnectors, so we always get the
 * feature-specific connector when one exists.
 */
export function useInferenceFeatureConnectors(
  featureId: string
): UseInferenceFeatureConnectorsResult {
  const { core } = useKibana();

  const query = useQuery<InferenceConnectorsApiResponseBody, Error>(
    ['streams-feature-connectors', featureId],
    () =>
      core.http.get<InferenceConnectorsApiResponseBody>(INFERENCE_CONNECTORS_INTERNAL_API_PATH, {
        query: { featureId },
        version: '1',
      }),
    { retry: false, keepPreviousData: true }
  );

  // Feature-specific connectors take priority over the full catalog.
  const featureConnectors = query.data?.connectors ?? [];
  const allConnectors = query.data?.allConnectors ?? [];
  const raw = featureConnectors[0]?.connectorId ?? allConnectors[0]?.connectorId;
  const resolvedConnectorId = raw === NO_DEFAULT_CONNECTOR ? undefined : raw;

  return {
    resolvedConnectorId,
    loading: query.isLoading || query.isFetching,
    error: query.error ?? undefined,
  };
}
