/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errorMessageHeader } from '@kbn/alerting-types';

export const parseRuleCircuitBreakerErrorMessage = (
  message: string
): {
  summary: string;
  details?: string;
} => {
  if (!message.includes(errorMessageHeader)) {
    return {
      summary: message,
    };
  }
  const segments = message.split(' - ');
  return {
    summary: segments[1],
    details: segments[2],
  };
};
