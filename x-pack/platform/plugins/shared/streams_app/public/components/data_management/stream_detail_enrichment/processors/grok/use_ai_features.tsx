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
import { useKibana } from '../../../../../hooks/use_kibana';

export function useAIFeatures() {
  const {
    dependencies: {
      start: { observabilityAIAssistant, licensing },
    },
    core,
  } = useKibana();
  const genAiConnectors = observabilityAIAssistant.useGenAIConnectors();
  const license = useObservable(licensing.license$);
  const [tourCalloutDismissed, setTourCalloutDismissed] = useElasticLlmCalloutDismissed(
    ElasticLlmCalloutKey.TOUR_CALLOUT
  );
  const elasticManagedLlmConnector = getElasticManagedLlmConnector(genAiConnectors.connectors);

  if (genAiConnectors.loading) {
    return undefined;
  }

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

export type AIFeatures = NonNullable<ReturnType<typeof useAIFeatures>>;
