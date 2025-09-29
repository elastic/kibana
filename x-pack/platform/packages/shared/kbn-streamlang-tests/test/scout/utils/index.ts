/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';

/**
 * Expects that the provided value is defined while narrowing its type.
 */
export function expectDefined<T>(value: T): asserts value is Exclude<T, undefined> {
  expect(value).toBeDefined();

  // To satisfy TypeScript's control flow analysis
  if (typeof value === 'undefined') {
    throw new Error('Value is undefined');
  }
}
