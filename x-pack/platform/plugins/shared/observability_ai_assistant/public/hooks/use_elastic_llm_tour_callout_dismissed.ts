/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useLocalStorage from 'react-use/lib/useLocalStorage';

const TOUR_DISMISSED_KEY = 'observabilityAIAssistant_elasticLlmTourDismissed';

export function useElasticLlmTourCalloutDismissed(
  defaultValue = false
): [boolean, (isDismissed: boolean) => void] {
  const [dismissed = defaultValue, setDismissed] = useLocalStorage<boolean>(
    TOUR_DISMISSED_KEY,
    defaultValue
  );

  return [dismissed, setDismissed];
}
