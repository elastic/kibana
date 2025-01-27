/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { frequencyNotValidErrorMessage, stringNotValidErrorMessage } from './messages';

import type { ParsedDuration } from './types';

const TIME_UNITS = ['nanos', 'micros', 'ms', 's', 'm', 'h', 'd'];

export function parseDurationAboveZero(arg: unknown): ParsedDuration | string[] {
  if (typeof arg !== 'string' || arg === null) {
    return [stringNotValidErrorMessage];
  }

  // split string by groups of numbers and letters
  const regexStr = arg.match(/[a-z]+|[^a-z]+/gi);

  // only valid if one group of numbers and one group of letters
  if (regexStr === null || (Array.isArray(regexStr) && regexStr.length !== 2)) {
    return [frequencyNotValidErrorMessage];
  }

  const number = +regexStr[0];
  const timeUnit = regexStr[1];

  // only valid if number is an integer above 0
  if (isNaN(number) || !Number.isInteger(number) || number === 0) {
    return [frequencyNotValidErrorMessage];
  }

  if (!TIME_UNITS.includes(timeUnit)) {
    return [frequencyNotValidErrorMessage];
  }

  return { number, timeUnit };
}
