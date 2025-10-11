/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Cast a function to a jest.MockedFunction with precise type and zero any usage.
 */
export function asMock<P extends unknown[], R>(
  fn: (...args: P) => R
): jest.MockedFunction<(...args: P) => R> {
  return fn as unknown as jest.MockedFunction<(...args: P) => R>;
}
