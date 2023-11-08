/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memoize } from 'lodash';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';

/**
 * Represents the result of number validation.
 * @interface
 */
export interface NumberValidationResult {
  /** The minimum allowed value. */
  min: boolean;

  /** The maximum allowed value. */
  max: boolean;

  /** Boolean flag to allow integer values only. */
  integerOnly: boolean;
}

/**
 * An interface describing conditions for validating numbers.
 * @interface
 */
interface NumberValidatorConditions {
  /**
   * The minimum value for validation.
   */
  min?: number;

  /**
   * The maximum value for validation.
   */
  max?: number;

  /**
   * Indicates whether only integer values are valid.
   */
  integerOnly?: boolean;
}

/**
 * Validate if a number is within specified minimum and maximum bounds.
 *
 * @param conditions - An optional object containing validation conditions.
 * @returns validation results.
 * @throws {Error} If the provided conditions are invalid (min is greater than max).
 */
export function numberValidator(conditions?: NumberValidatorConditions) {
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
