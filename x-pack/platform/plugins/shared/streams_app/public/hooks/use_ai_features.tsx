/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useObservable from 'react-use/lib/useObservable';
import { isEmpty } from 'lodash';
import {
  ElasticLlmCalloutKey,
  useElasticLlmCalloutDismissed,
  getElasticManagedLlmConnector,
} from '@kbn/observability-ai-assistant-plugin/public';
import { STREAMS_TIERED_AI_FEATURE } from '@kbn/streams-plugin/common';
import type { UseGenAIConnectorsResult } from '@kbn/observability-ai-assistant-plugin/public/hooks/use_genai_connectors';
import { useKibana } from './use_kibana';

export interface AIFeatures {
  enabled: boolean;
  couldBeEnabled: boolean;
  genAiConnectors: UseGenAIConnectorsResult;
  isManagedAIConnector: boolean;
  hasAcknowledgedAdditionalCharges: boolean;
  acknowledgeAdditionalCharges: (isDismissed: boolean) => void;
}

export function useAIFeatures(): AIFeatures | null {
  const {
    dependencies: {
      start: { observabilityAIAssistant, licensing },
    },
    core,
  } = useKibana();

  const isAIAvailableForTier = core.pricing.isFeatureAvailable(STREAMS_TIERED_AI_FEATURE.id);

  const genAiConnectors = observabilityAIAssistant?.useGenAIConnectors();
  const license = useObservable(licensing.license$);
  const [tourCalloutDismissed, setTourCalloutDismissed] = useElasticLlmCalloutDismissed(
    ElasticLlmCalloutKey.TOUR_CALLOUT
  );

  if (
    !isAIAvailableForTier ||
    !observabilityAIAssistant ||
    !genAiConnectors ||
    genAiConnectors.loading
  ) {
    return null;
  }

  const elasticManagedLlmConnector = getElasticManagedLlmConnector(genAiConnectors.connectors);

  const enabled =
    observabilityAIAssistant.service.isEnabled() && !isEmpty(genAiConnectors.connectors);

  const couldBeEnabled = Boolean(
    license?.hasAtLeast('enterprise') && core.application.capabilities.actions?.save
  );
  const isManagedAIConnector = elasticManagedLlmConnector
    ? elasticManagedLlmConnector.id === genAiConnectors.selectedConnector
    : false;

  return {
    enabled,
    couldBeEnabled,
    genAiConnectors,
    isManagedAIConnector,
    hasAcknowledgedAdditionalCharges: tourCalloutDismissed,
    acknowledgeAdditionalCharges: setTourCalloutDismissed,
  };
}
