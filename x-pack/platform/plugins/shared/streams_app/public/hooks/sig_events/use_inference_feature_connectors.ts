/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { InferenceConnector } from '@kbn/inference-common';
import { useLoadConnectors } from '@kbn/inference-connectors';
import { useKibana } from '../use_kibana';
import { toInferenceConnector } from '../to_inference_connector';

const EMPTY_CONNECTORS: InferenceConnector[] = [];

export interface UseInferenceFeatureConnectorsResult {
  /**
   * Connector list for the inference feature, returned verbatim in the order
   * the backend delivered it. This is what per-step model dropdowns render.
   */
  connectors: InferenceConnector[];
  /**
   * Connector to pre-select and badge as "Default" — the first entry of the
   * backend-supplied list.
   */
  resolvedConnectorId: string | undefined;
  loading: boolean;
  error: Error | undefined;
}

/**
 * Loads the connector list for a Significant Events inference feature.
 *
 * Delegates fetching, caching and error handling to the inference plugin's
 * {@link useLoadConnectors}. The backend route is the single source of truth
 * for ordering (admin SO override > global default > feature recommendeds >
 * rest of catalog), so we render its response verbatim and pick the first
 * entry as the pre-selected model.
 */
export function useInferenceFeatureConnectors(
  featureId: string
): UseInferenceFeatureConnectorsResult {
  const {
    core: {
      http,
      notifications: { toasts },
    },
  } = useKibana();

  const query = useLoadConnectors({ http, toasts, featureId });
  const aiConnectors = query.data;

  const connectors = useMemo<InferenceConnector[]>(
    () => (aiConnectors?.length ? aiConnectors.map(toInferenceConnector) : EMPTY_CONNECTORS),
    [aiConnectors]
  );

  return {
    connectors,
    resolvedConnectorId: aiConnectors?.[0]?.id,
    loading: query.isLoading || query.isFetching,
    error: query.error ?? undefined,
  };
}
