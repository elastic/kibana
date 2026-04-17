/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { InferenceConnector } from '@kbn/inference-common';
import { useLoadConnectors, type AIConnector } from '@kbn/inference-connectors';
import { useKibana } from '../use_kibana';
import { toInferenceConnector } from '../to_inference_connector';

const EMPTY_CONNECTORS: InferenceConnector[] = [];

export interface UseInferenceFeatureConnectorsResult {
  /**
   * Connector list scoped to the inference feature, ordered so that the
   * feature's recommended endpoints (registry order) are listed first and the
   * rest of the catalog follows. This is what per-step model dropdowns render.
   */
  connectors: InferenceConnector[];
  /**
   * Connector that should be pre-selected and badged as "Default" — the
   * feature's first recommended endpoint, falling back to the first connector
   * the API returns when nothing is recommended.
   */
  resolvedConnectorId: string | undefined;
  loading: boolean;
  error: Error | undefined;
}

/**
 * Loads the connector list for a Significant Events inference feature.
 *
 * Delegates fetching, caching and error handling to the inference plugin's
 * {@link useLoadConnectors}. The backend already merges the per-feature
 * recommended endpoints with the rest of the catalog and flags the
 * recommended ones with `isRecommended`. The route additionally prepends the
 * user's `GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR` (without the recommended
 * flag) when no admin override is set, so we stable-sort recommended entries
 * back to the top so the step's recommended models stay at the top of the
 * dropdown.
 */
export function useInferenceFeatureConnectors(
  featureId: string
): UseInferenceFeatureConnectorsResult {
  const { core } = useKibana();
  const { http, notifications } = core;

  const {
    data: aiConnectors,
    isLoading,
    error,
    soEntryFound,
  } = useLoadConnectors({ http, toasts: notifications.toasts, featureId });

  const orderedAiConnectors = useMemo<AIConnector[]>(() => {
    if (!aiConnectors?.length) return [];
    if (soEntryFound) return aiConnectors;
    return [...aiConnectors].sort((a, b) => Number(!!b.isRecommended) - Number(!!a.isRecommended));
  }, [aiConnectors, soEntryFound]);

  const connectors = useMemo<InferenceConnector[]>(
    () =>
      orderedAiConnectors.length === 0
        ? EMPTY_CONNECTORS
        : orderedAiConnectors.map(toInferenceConnector),
    [orderedAiConnectors]
  );

  const resolvedConnectorId = useMemo<string | undefined>(() => {
    if (!aiConnectors?.length) return undefined;
    if (soEntryFound) return aiConnectors[0]?.id;
    return aiConnectors.find((c) => c.isRecommended)?.id ?? aiConnectors[0]?.id;
  }, [aiConnectors, soEntryFound]);

  return {
    connectors,
    resolvedConnectorId,
    loading: isLoading,
    error: error ?? undefined,
  };
}
