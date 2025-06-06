/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useLocalStorage from 'react-use/lib/useLocalStorage';

export enum ElasticLlmCalloutKey {
  TOUR_CALLOUT = 'observabilityAIAssistant_elasticLlmTourCalloutDismissed',
  CONVERSATION_CALLOUT = 'observabilityAIAssistant_elasticLlmConversationCalloutDismissed',
}

export function useElasticLlmCalloutDismissed(
  storageKey: ElasticLlmCalloutKey,
  defaultValue = false
): [boolean, (isDismissed: boolean) => void] {
  const [dismissed = defaultValue, setDismissed] = useLocalStorage<boolean>(
    storageKey,
    defaultValue
  );

  return [dismissed, setDismissed];
}
