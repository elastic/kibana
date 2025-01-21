/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { frequencyNotValidErrorMessage } from './messages';

import { parseDurationAboveZero } from './parse_duration_above_zero';
import { isValidFrequency } from './is_valid_frequency';
import type { Validator } from './types';

// Only allow frequencies in the form of 1s/1h etc.
export const frequencyValidator: Validator = (arg) => {
  const parsedArg = parseDurationAboveZero(arg);

  if (Array.isArray(parsedArg)) {
    return parsedArg;
  }

  return isValidFrequency(parsedArg) ? [] : [frequencyNotValidErrorMessage];
};
