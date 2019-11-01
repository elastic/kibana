/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { castArray, isUndefined } from 'lodash/fp';

export const encodeIpv6 = (ip: string) => ip.replace(/:/g, '-');
export const decodeIpv6 = (ip: string) => ip.replace(/-/g, ':');

export type Many<T> = T | readonly T[];
export type WrapArrayIfExitts = <T>(value: Many<T>) => T[] | undefined;

/**
 * Wraps `value` in an array if `value` is not already an array, and returns
 * `undefined` if `value` is `undefined`
 */
export const asArrayIfExists: WrapArrayIfExitts = value =>
  !isUndefined(value) ? castArray(value) : undefined;

export const wait = (delay = 0): Promise<void> => {
  return new Promise(resolve => {
    return setTimeout(resolve, delay);
  });
};

/**
 * Creates a Union Type for all the values of an object
 */
export type ValueOf<T> = T[keyof T];

/**
 * Unreachable Assertion helper for scenarios like exhaustive switches
 *
 * @param x Unreachable field
 * @param message Message of error thrown
 */
export const assertUnreachable = (
  x: never,
  message = 'Unknown Field in switch statement'
): never => {
  throw new Error(`${message}: ${x}`);
};

/**
 * Global variables
 */

export const gutterTimeline = '70px'; // Michael: Temporary until timeline is moved.
