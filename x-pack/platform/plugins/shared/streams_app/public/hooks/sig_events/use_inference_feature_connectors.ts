/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AIConnector } from '@kbn/inference-connectors';
import { useLoadConnectors } from '@kbn/inference-connectors';
import { useKibana } from '../use_kibana';

export interface UseInferenceFeatureConnectorsResult {
  resolvedConnector: AIConnector | undefined;
  allConnectors: AIConnector[];
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

  return {
    resolvedConnector: query.data?.[0],
    allConnectors: query.data ?? [],
    loading: query.isLoading,
    error: query.error ?? undefined,
  };
}
