/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  useElasticLlmCalloutDismissed,
  ElasticLlmCalloutKey,
} from '@kbn/observability-ai-assistant-plugin/public';

/**
 * Custom hook that returns the dismissed state for both conversation and tour callouts
 * @returns An object containing both dismissed states
 */
export function useElasticLlmCalloutsStatus(defaultValue = false) {
  const [conversationCalloutDismissed] = useElasticLlmCalloutDismissed(
    ElasticLlmCalloutKey.CONVERSATION_CALLOUT,
    defaultValue
  );

  const [tourCalloutDismissed] = useElasticLlmCalloutDismissed(
    ElasticLlmCalloutKey.TOUR_CALLOUT,
    defaultValue
  );

  return {
    conversationCalloutDismissed,
    tourCalloutDismissed,
  };
}
