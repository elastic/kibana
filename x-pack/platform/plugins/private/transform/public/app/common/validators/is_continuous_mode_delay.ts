/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Validates continuous mode time delay input.
 * Doesn't allow floating intervals.
 * @param value User input value.
 */
export function isContinuousModeDelay(value: string): boolean {
  return value.match(/^(0|\d*(nanos|micros|ms|s|m|h|d))$/) !== null;
}
