/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STREAMS_TIERED_AI_FEATURE } from '@kbn/streams-plugin/common';
import { isEmpty } from 'lodash';
import useObservable from 'react-use/lib/useObservable';
import { useKibana } from '../../../../hooks/use_kibana';

export function useAIFeatures() {
  const {
    dependencies: {
      start: { observabilityAIAssistant, licensing },
    },
    core,
  } = useKibana();

  const isAIAvailableForTier = core.pricing.isFeatureAvailable(STREAMS_TIERED_AI_FEATURE.id);
  const license = useObservable(licensing.license$);
  const genAiConnectors = observabilityAIAssistant?.useGenAIConnectors();

  if (!observabilityAIAssistant || !genAiConnectors) {
    return null;
  }

  const couldBeEnabled = Boolean(
    isAIAvailableForTier &&
      license?.hasAtLeast('enterprise') &&
      core.application.capabilities.actions?.save
  );
  const enabled =
    observabilityAIAssistant.service.isEnabled() && !isEmpty(genAiConnectors.connectors);

  return {
    enabled,
    couldBeEnabled,
    genAiConnectors,
  };
}
