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
import { toInferenceConnector } from '../use_genai_connectors';

const EMPTY_CONNECTORS: InferenceConnector[] = [];

export interface UseInferenceFeatureConnectorsResult {
  /**
   * Full connector list scoped to the feature: the feature's recommended
   * endpoints first, followed by the rest of the catalog. This is what
   * per-step model dropdowns should render to keep the recommended models
   * at the top.
   */
  connectors: InferenceConnector[];
  /**
   * The connector the inference plugin resolves for this feature — the one
   * that should be pre-selected and badged as "Default".
   */
  resolvedConnectorId: string | undefined;
  loading: boolean;
  error: Error | undefined;
}

export function useInferenceFeatureConnectors(
  featureId: string
): UseInferenceFeatureConnectorsResult {
  const { core } = useKibana();

  const query = useLoadConnectors({
    http: core.http,
    toasts: core.notifications.toasts,
    featureId,
    settings: core.settings,
  });

  const connectors = useMemo<InferenceConnector[]>(
    () => query.data?.map(toInferenceConnector) ?? EMPTY_CONNECTORS,
    [query.data]
  );

  // When an SO override is set, the API puts the configured connector first.
  // Otherwise `useLoadConnectors` prepends `GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR`
  // ahead of the feature's recommended endpoints — so we skip it and pick the
  // first entry flagged `isRecommended` for this feature.
  const data = query.data ?? [];
  const picked = query.soEntryFound ? data[0] : data.find((c) => c.isRecommended) ?? data[0];

  return {
    connectors,
    resolvedConnectorId: picked?.id,
    loading: query.isLoading,
    error: query.error ?? undefined,
  };
}
