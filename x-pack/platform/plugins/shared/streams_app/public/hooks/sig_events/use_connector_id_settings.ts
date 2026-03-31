/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '../use_kibana';
import { useStreamsAppFetch } from '../use_streams_app_fetch';

/**
 * Fetches per-step connector ID settings and computes whether each step has a
 * connector configured, falling back to the global default AI connector when a
 * per-step connector is not set.
 *
 * Pass `defaultConnector` from `useAIFeatures().genAiConnectors.defaultConnector`
 * so the calling component controls the single `useAIFeatures()` call.
 */
export function useConnectorIdSettings(defaultConnector: string | undefined) {
  const {
    dependencies: {
      start: { streams },
    },
  } = useKibana();

  const settingsFetch = useStreamsAppFetch(
    ({ signal }) =>
      streams.streamsRepositoryClient.fetch('GET /internal/streams/_significant_events/settings', {
        signal,
      }),
    [streams.streamsRepositoryClient]
  );

  const isConfigured = (stepConnectorId: string | undefined): boolean =>
    !!stepConnectorId || !!defaultConnector;

  const isRuleGenerationConnectorConfigured = isConfigured(
    settingsFetch.value?.connectorIdRuleGeneration
  );
  const isKnowledgeIndicatorExtractionConnectorConfigured = isConfigured(
    settingsFetch.value?.connectorIdKnowledgeIndicatorExtraction
  );
  const isDiscoveryConnectorConfigured = isConfigured(settingsFetch.value?.connectorIdDiscovery);

  return {
    ...settingsFetch,
    /** True when both onboarding sub-tasks (feature extraction + rule generation) have a connector. */
    isOnboardingConnectorConfigured:
      isKnowledgeIndicatorExtractionConnectorConfigured && isRuleGenerationConnectorConfigured,
    /** "Generate suggestions" standalone step. */
    isRuleGenerationConnectorConfigured,
    /** "Discover Insights" step. */
    isDiscoveryConnectorConfigured,
    /** Knowledge Indicator Feature extraction step. */
    isKnowledgeIndicatorExtractionConnectorConfigured,
  };
}
