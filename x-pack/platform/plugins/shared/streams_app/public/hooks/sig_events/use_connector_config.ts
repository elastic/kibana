/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OnboardingStep,
  STREAMS_SIG_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID,
  STREAMS_SIG_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID,
  STREAMS_SIG_EVENTS_KI_QUERY_GENERATION_INFERENCE_FEATURE_ID,
} from '@kbn/streams-schema';
import type { InferenceConnector } from '@kbn/inference-common';
import { useEffect, useState } from 'react';
import type { OnboardingConfig } from '../../components/sig_events/significant_events_discovery/components/streams_view/types';
import { useAIFeatures } from '../use_ai_features';
import { useInferenceFeatureConnectors } from './use_inference_feature_connectors';

const EMPTY_CONNECTORS: InferenceConnector[] = [];

export function useConnectorConfig() {
  const featuresConnectors = useInferenceFeatureConnectors(
    STREAMS_SIG_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID
  );
  const queriesConnectors = useInferenceFeatureConnectors(
    STREAMS_SIG_EVENTS_KI_QUERY_GENERATION_INFERENCE_FEATURE_ID
  );
  const discoveryConnectors = useInferenceFeatureConnectors(
    STREAMS_SIG_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID
  );

  const aiFeatures = useAIFeatures();
  const genAiConnectors = aiFeatures?.genAiConnectors;
  const allConnectors = genAiConnectors?.connectors ?? EMPTY_CONNECTORS;
  const connectorError = genAiConnectors?.error;
  const isConnectorCatalogUnavailable =
    !allConnectors.length || !!genAiConnectors?.loading || !!connectorError;

  const [discoveryConnectorOverride, setDiscoveryConnectorOverride] = useState<
    string | undefined
  >();
  const displayDiscoveryConnectorId =
    discoveryConnectorOverride ?? discoveryConnectors.resolvedConnectorId;

  const [onboardingConfig, setOnboardingConfig] = useState<OnboardingConfig>({
    steps: [OnboardingStep.FeaturesIdentification, OnboardingStep.QueriesGeneration],
    connectors: {},
  });

  useEffect(() => {
    setOnboardingConfig((prev) => {
      const features = prev.connectors.features ?? featuresConnectors.resolvedConnectorId;
      const queries = prev.connectors.queries ?? queriesConnectors.resolvedConnectorId;
      if (features === prev.connectors.features && queries === prev.connectors.queries) {
        return prev;
      }
      return { ...prev, connectors: { features, queries } };
    });
  }, [featuresConnectors.resolvedConnectorId, queriesConnectors.resolvedConnectorId]);

  return {
    featuresConnectors,
    queriesConnectors,
    discoveryConnectors,
    allConnectors,
    connectorError,
    isConnectorCatalogUnavailable,
    discoveryConnectorOverride,
    setDiscoveryConnectorOverride,
    displayDiscoveryConnectorId,
    onboardingConfig,
    setOnboardingConfig,
  };
}
