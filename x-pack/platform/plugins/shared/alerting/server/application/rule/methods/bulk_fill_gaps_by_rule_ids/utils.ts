/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkGapsFillStep } from './types';

export const toBulkGapFillError = (
  rule: { id: string; name: string },
  step: BulkGapsFillStep,
  error: Error
) => {
  let fallbackMessage: string;
  switch (step) {
    case 'BULK_GAPS_FILL_STEP_SCHEDULING':
      fallbackMessage = 'Error scheduling backfills';
      break;
    case 'BULK_GAPS_FILL_STEP_GAPS_RESOLUTION':
      fallbackMessage = 'Error resolving gaps';
      break;
    case 'BULK_GAPS_FILL_STEP_ACCESS_VALIDATION':
      fallbackMessage = 'Error validating user access to the rule';
  }
  return {
    rule: {
      id: rule.id,
      name: rule.name,
    },
    step,
    errorMessage: error?.message ?? fallbackMessage,
  };
};
