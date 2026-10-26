/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Condition } from '../../types/conditions';
import { isAlwaysCondition } from '../../types/conditions';
import { isConditionComplete } from '../conditions/helpers';
import type { StreamlangValidationError } from './types';

/**
 * Validates that a condition is complete (all required values are filled).
 *
 * @param condition - The condition to validate
 * @param processorNumber - 1-based index for error messages
 * @param processorId - Unique identifier for the processor
 * @returns Array of validation errors for this condition
 */
export function validateCondition(
  condition: Condition | undefined,
  processorNumber: number,
  processorId: string
): StreamlangValidationError[] {
  const errors: StreamlangValidationError[] = [];

  // Skip if no condition or if it's 'always'
  if (!condition || isAlwaysCondition(condition)) {
    return errors;
  }

  if (!isConditionComplete(condition)) {
    errors.push({
      type: 'invalid_value',
      message: i18n.translate('xpack.streamlang.validation.incompleteCondition', {
        defaultMessage:
          'Processor #{processorNumber} has an incomplete condition: all required values must be filled',
        values: { processorNumber },
      }),
      processorId,
      field: 'where',
    });
  }

  return errors;
}
