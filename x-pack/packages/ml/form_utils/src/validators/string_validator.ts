/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Validator } from '../validator';

import { requiredErrorMessage, stringNotValidErrorMessage } from './messages';

/**
 * Validates a string based on its type and optionality.
 * Returns an error message array if the value is not a valid string or is required but empty.
 *
 * @param value - The value to validate.
 * @param isOptional - Indicates if the string can be empty. Defaults to true.
 * @returns An array of error messages or an empty array if valid.
 */
export const stringValidator: Validator = (value, isOptional = true) => {
  if (typeof value !== 'string') {
    return [stringNotValidErrorMessage];
  }

  if (value.length === 0 && !isOptional) {
    return [requiredErrorMessage];
  }

  return [];
};
