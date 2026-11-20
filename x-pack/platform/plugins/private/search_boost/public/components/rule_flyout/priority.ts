/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidPriority } from '../../../common/validation';

const DIGITS = /^\d+$/;

/** Reads a priority typed in the field, turning an empty or invalid value into 0. */
export const parsePriority = (value: string): number => {
  const priority = DIGITS.test(value) ? Number(value) : 0;
  return isValidPriority(priority) ? priority : 0;
};
