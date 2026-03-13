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
} from '@kbn/observability-ai-assistant-plugin/public';
import { STREAMS_TIERED_AI_FEATURE } from '@kbn/streams-plugin/common';
import { useKibana } from './use_kibana';
import { useGenAIConnectors, type UseGenAIConnectorsResult } from './use_genai_connectors';
import { getElasticManagedLlmConnector } from '../utils/get_elastic_managed_llm_connector';

export interface AIFeatures {
  loading: boolean;
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
      start: { licensing, streams },
    },
    core,
  } = useKibana();

  const isAIAvailableForTier = core.pricing.isFeatureAvailable(STREAMS_TIERED_AI_FEATURE.id);

  const genAiConnectors = useGenAIConnectors({
    streamsRepositoryClient: streams.streamsRepositoryClient,
    uiSettings: core.uiSettings,
  });
  const license = useObservable(licensing.license$);
  const [tourCalloutDismissed, setTourCalloutDismissed] = useElasticLlmCalloutDismissed(
    ElasticLlmCalloutKey.TOUR_CALLOUT
  );

  if (!isAIAvailableForTier) {
    return null;
  }

  if (genAiConnectors.loading) {
    return {
      loading: true,
      enabled: false,
      couldBeEnabled: false,
      genAiConnectors,
      isManagedAIConnector: false,
      hasAcknowledgedAdditionalCharges: tourCalloutDismissed,
      acknowledgeAdditionalCharges: setTourCalloutDismissed,
    };
  }

  const elasticManagedLlmConnector = getElasticManagedLlmConnector(genAiConnectors.connectors);

  // Check for actions.show permission (read access is sufficient for listing connectors)
  const hasActionsPermission = core.application.capabilities.actions?.show || false;

  const enabled =
    Boolean(license?.hasAtLeast('enterprise')) &&
    hasActionsPermission &&
    !isEmpty(genAiConnectors.connectors);

  const couldBeEnabled = Boolean(
    license?.hasAtLeast('enterprise') && core.application.capabilities.actions?.show
  );
  const isManagedAIConnector = elasticManagedLlmConnector
    ? elasticManagedLlmConnector.id === genAiConnectors.selectedConnector
    : false;

  return {
    loading: false,
    enabled,
    couldBeEnabled,
    genAiConnectors,
    isManagedAIConnector,
    hasAcknowledgedAdditionalCharges: tourCalloutDismissed,
    acknowledgeAdditionalCharges: setTourCalloutDismissed,
  };
}
