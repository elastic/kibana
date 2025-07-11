/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STREAMS_TIERED_AI_FEATURE } from '@kbn/streams-plugin/common';
import { useKibana } from '../../../hooks/use_kibana';

export function useAIFeatures() {
  const {
    dependencies: {
      start: { observabilityAIAssistant },
    },
    core,
  } = useKibana();

  const isAIAvailableForTier = core.pricing.isFeatureAvailable(STREAMS_TIERED_AI_FEATURE.id);

  const genAiConnectors = observabilityAIAssistant?.useGenAIConnectors();

  if (
    !isAIAvailableForTier ||
    !observabilityAIAssistant ||
    !genAiConnectors ||
    genAiConnectors.loading
  ) {
    return { enabled: false, selectedConnector: undefined };
  }

  const selectedConnector = genAiConnectors.selectedConnector;
  const enabled = observabilityAIAssistant.service.isEnabled() && Boolean(selectedConnector);

  return {
    enabled,
    selectedConnector,
  };
}

export type AIFeatures = NonNullable<ReturnType<typeof useAIFeatures>>;
