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
import { useMemo, useState } from 'react';
import type { OnboardingConfig } from '../../components/sig_events/significant_events_discovery/components/streams_view/onboarding_config_popover';
import {
  GENERATE_FEATURES_BUTTON_LABEL,
  GENERATE_QUERIES_BUTTON_LABEL,
  RUN_BULK_STREAM_ONBOARDING_BUTTON_LABEL,
} from '../../components/sig_events/significant_events_discovery/components/streams_view/translations';
import { useAIFeatures } from '../use_ai_features';
import { useInferenceFeatureConnectors } from './use_inference_feature_connectors';

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
  const isConnectorCatalogUnavailable =
    !genAiConnectors?.connectors?.length || !!genAiConnectors?.loading || !!genAiConnectors?.error;

  const [discoveryConnectorOverride, setDiscoveryConnectorOverride] = useState<
    string | undefined
  >();
  const displayDiscoveryConnectorId =
    discoveryConnectorOverride ?? discoveryConnectors.resolvedConnectorId;

  const [onboardingConfig, setOnboardingConfig] = useState<OnboardingConfig>({
    steps: [OnboardingStep.FeaturesIdentification, OnboardingStep.QueriesGeneration],
    connectors: {},
  });

  const displayConnectors = useMemo(
    () => ({
      features: onboardingConfig.connectors.features ?? featuresConnectors.resolvedConnectorId,
      queries: onboardingConfig.connectors.queries ?? queriesConnectors.resolvedConnectorId,
    }),
    [
      onboardingConfig.connectors,
      featuresConnectors.resolvedConnectorId,
      queriesConnectors.resolvedConnectorId,
    ]
  );

  const { steps: selectedSteps } = onboardingConfig;
  const dynamicButtonLabel = useMemo(() => {
    const hasFeatures = selectedSteps.includes(OnboardingStep.FeaturesIdentification);
    const hasQueries = selectedSteps.includes(OnboardingStep.QueriesGeneration);
    if (hasFeatures && !hasQueries) return GENERATE_FEATURES_BUTTON_LABEL;
    if (hasQueries && !hasFeatures) return GENERATE_QUERIES_BUTTON_LABEL;
    return RUN_BULK_STREAM_ONBOARDING_BUTTON_LABEL;
  }, [selectedSteps]);

  return {
    featuresConnectors,
    queriesConnectors,
    discoveryConnectors,
    genAiConnectors,
    isConnectorCatalogUnavailable,
    discoveryConnectorOverride,
    setDiscoveryConnectorOverride,
    displayDiscoveryConnectorId,
    onboardingConfig,
    setOnboardingConfig,
    displayConnectors,
    dynamicButtonLabel,
  };
}
