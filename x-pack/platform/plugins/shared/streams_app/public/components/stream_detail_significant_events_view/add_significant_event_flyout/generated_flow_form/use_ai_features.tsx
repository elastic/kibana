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
import { useGenAIConnectors } from '../../../../hooks/use_genai_connectors';

export function useAIFeatures() {
  const {
    dependencies: {
      start: { licensing, streams },
    },
    core,
  } = useKibana();

  const isAIAvailableForTier = core.pricing.isFeatureAvailable(STREAMS_TIERED_AI_FEATURE.id);
  const license = useObservable(licensing.license$);
  const genAiConnectors = useGenAIConnectors({
    streamsRepositoryClient: streams.streamsRepositoryClient,
    uiSettings: core.uiSettings,
  });

  // Check if actions plugin access is available (read permission)
  const hasActionsAccess = core.application.capabilities.actions?.show;

  if (!hasActionsAccess || !genAiConnectors) {
    return null;
  }

  const couldBeEnabled = Boolean(
    isAIAvailableForTier && license?.hasAtLeast('enterprise') && hasActionsAccess
  );
  const enabled = Boolean(couldBeEnabled && !isEmpty(genAiConnectors.connectors));

  return {
    enabled,
    couldBeEnabled,
    genAiConnectors,
  };
}
