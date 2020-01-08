/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const assertCloseTo = (actual: number, expected: number, precision: number) => {
  if (Math.abs(expected - actual) > precision) {
    throw new Error(`expected [${expected}] to be within ${precision} of ${actual}`);
  }
};
