/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memoize } from 'lodash';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';

export interface NumberValidationResult {
  min: boolean;
  max: boolean;
  integerOnly: boolean;
}

/**
 * Validate if a number is greater than a specified minimum & lesser than specified maximum
 */
export function numberValidator(conditions?: {
  min?: number;
  max?: number;
  integerOnly?: boolean;
}) {
  if (
    conditions?.min !== undefined &&
    conditions.max !== undefined &&
    conditions.min > conditions.max
  ) {
    throw new Error('Invalid validator conditions');
  }

  return memoize((value: number): NumberValidationResult | null => {
    const result = {} as NumberValidationResult;
    if (conditions?.min !== undefined && value < conditions.min) {
      result.min = true;
    }
    if (conditions?.max !== undefined && value > conditions.max) {
      result.max = true;
    }
    if (!!conditions?.integerOnly && !Number.isInteger(value)) {
      result.integerOnly = true;
    }
    if (isPopulatedObject(result)) {
      return result;
    }
    return null;
  });
}
