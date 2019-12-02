/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const defaultMockSavedObjects = [{
  _id: 'milk:steak',
  _source: {
    type: 'food',
  },
}];
const defaultMockTaskDocs = [{ state: { runs: 0, stats: {} } }];

export const getMockTaskInstance = () => ({ state: { runs: 0, stats: {} } });

export const getMockCallWithInternal = (hits = defaultMockSavedObjects) => {
  return () => {
    return Promise.resolve({ hits: { hits } });
  };
};

export const getMockTaskFetch = (docs = defaultMockTaskDocs) => {
  return () => Promise.resolve({ docs });
};

export const getMockKbnServer = (
  mockCallWithInternal = getMockCallWithInternal(),
  mockTaskFetch = getMockTaskFetch()) => ({
  plugins: {
    elasticsearch: {
      getCluster: () => ({
        callWithInternalUser: mockCallWithInternal,
      }),
    },
    xpack_main: {},
    task_manager: {
      registerTaskDefinitions: () => undefined,
      schedule: () => Promise.resolve(),
      fetch: mockTaskFetch,
    },
  },
  config: () => ({ get: () => '' }),
  log: () => undefined
});
