/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { last } from 'lodash';

/**
 * Invoke all setState calls, passing the previous state into subsequent
 * calls, and return the state transitions as an array of states.
 *
 * @param setState
 * @param initialState
 */
export function getStateChanges(setState: jest.Mock, initialState = {}) {
  const [, ...rest] = setState.mock.calls.reduce(
    (acc, [f]) => {
      const prevState = last(acc);
      acc.push(f(prevState));
      return acc;
    },
    [initialState]
  );

  return rest;
}

/**
 * Wait for the specified number of event loop cycles.
 */
export async function waitForPromises(n = 2) {
  for (let i = 0; i < n; ++i) {
    await Promise.resolve();
  }
}
