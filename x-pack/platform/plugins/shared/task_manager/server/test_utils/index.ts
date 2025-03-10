/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';

/*
 * A handful of helper functions for testing the task manager.
 */

// Caching this here to avoid setTimeout mocking affecting our tests.
const nativeTimeout = setTimeout;

export function mockLogger() {
  return loggingSystemMock.createLogger();
}
export interface Resolvable {
  resolve: () => void;
}

/**
 * Creates a promise which can be resolved externally, useful for
 * coordinating async tests.
 */
export function resolvable(): PromiseLike<void> & Resolvable {
  let resolve: () => void;
  return Object.assign(new Promise<void>((r) => (resolve = r)), {
    resolve() {
      return nativeTimeout(resolve, 0);
    },
  });
}

/**
 * A simple helper for waiting a specified number of milliseconds.
 *
 * @param {number} ms
 */
export async function sleep(ms: number) {
  return new Promise((r) => nativeTimeout(r, ms));
}
