/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type SnoozeUnit = 'm' | 'h' | 'd' | 'w' | 'M';
export const COMMON_SNOOZE_TIMES: Array<[number, SnoozeUnit]> = [
  [1, 'h'],
  [3, 'h'],
  [8, 'h'],
  [1, 'd'],
];
