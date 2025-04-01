/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseInterval } from '@kbn/ml-parse-interval';

import { ALLOWED_DATA_UNITS } from './constants';

/**
 * Provides a validator function for maximum allowed input length.
 * @param maxLength Maximum length allowed.
 */
export function maxLengthValidator(
  maxLength: number
): (value: string) => { maxLength: { requiredLength: number; actualLength: number } } | null {
  return (value) =>
    value && value.length > maxLength
      ? {
          maxLength: {
            requiredLength: maxLength,
            actualLength: value.length,
          },
        }
      : null;
}

/**
 * Factory that provides a validator function for checking against pattern.
 * @param pattern Pattern to check against.
 * @returns A validator function that checks if the value matches the pattern.
 */
export function patternValidator(
  pattern: RegExp
): (value: string) => { pattern: { matchPattern: string } } | null {
  return (value) =>
    pattern.test(value)
      ? null
      : {
          pattern: {
            matchPattern: pattern.toString(),
          },
        };
}

/**
 * Factory that composes multiple validators into a single function.
 *
 * @param validators List of validators to compose.
 * @returns A validator function that runs all the validators.
 */
export function composeValidators(
  ...validators: Array<(value: any) => { [key: string]: any } | null>
): (value: any) => { [key: string]: any } | null {
  return (value) => {
    const validationResult = validators.reduce((acc, validator) => {
      return Object.assign(acc, validator(value) || {});
    }, {});
    return Object.keys(validationResult).length > 0 ? validationResult : null;
  };
}

/**
 * Factory to create a required validator function.
 * @returns A validator function that checks if the value is empty.
 */
export function requiredValidator() {
  return <T extends string>(value: T) => {
    return value === '' || value === undefined || value === null ? { required: true } : null;
  };
}

/**
 * Type for the result of a validation.
 */
export type ValidationResult = Record<string, any> | null;

/**
 * Type for the result of a memory input validation.
 */
export type MemoryInputValidatorResult = { invalidUnits: { allowedUnits: string } } | null;

/**
 * Factory for creating a memory input validator function.
 *
 * @param allowedUnits Allowed units for the memory input.
 * @returns A validator function that checks if the value is a valid memory input.
 */
export function memoryInputValidator(allowedUnits = ALLOWED_DATA_UNITS) {
  return <T>(value: T) => {
    if (typeof value !== 'string' || value === '') {
      return null;
    }
    const regexp = new RegExp(`\\d+(${allowedUnits.join('|')})$`, 'i');
    return regexp.test(value.trim())
      ? null
      : { invalidUnits: { allowedUnits: allowedUnits.join(', ') } };
  };
}

/**
 * Factory for creating a time interval input validator function.
 *
 * @returns A validator function that checks if the value is a valid time interval.
 */
export function timeIntervalInputValidator() {
  return (value: string) => {
    if (value === '') {
      return null;
    }

    const r = parseInterval(value);
    if (r === null) {
      return {
        invalidTimeInterval: true,
      };
    }

    return null;
  };
}

/**
 * Factory to create a dictionary validator function.
 * @param dict Dictionary to check against.
 * @param shouldInclude Whether the value should be included in the dictionary.
 * @returns A validator function that checks if the value is in the dictionary.
 */
export function dictionaryValidator(dict: string[], shouldInclude: boolean = false) {
  const dictSet = new Set(dict);
  return (value: string) => {
    if (dictSet.has(value) !== shouldInclude) {
      return { matchDict: value };
    }
    return null;
  };
}
