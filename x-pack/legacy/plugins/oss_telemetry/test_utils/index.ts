/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESQueryResponse, HapiServer, SavedObjectDoc, TaskInstance } from '../';

export const getMockTaskInstance = (): TaskInstance => ({
  taskType: '',
  params: {},
  state: { runs: 0, stats: {} },
});

const defaultMockSavedObjects = [
  {
    _id: 'visualization:coolviz-123',
    _source: {
      type: 'visualization',
      visualization: { visState: '{"type": "shell_beads"}' },
    },
  },
];

const defaultMockTaskDocs = [getMockTaskInstance()];

export const getMockCallWithInternal = (hits: SavedObjectDoc[] = defaultMockSavedObjects) => {
  return (): Promise<ESQueryResponse> => {
    return Promise.resolve({ hits: { hits } });
  };
};

export const getMockTaskFetch = (docs: TaskInstance[] = defaultMockTaskDocs) => {
  return () => Promise.resolve({ docs });
};

export const getMockKbnServer = (
  mockCallWithInternal = getMockCallWithInternal(),
  mockTaskFetch = getMockTaskFetch()
): HapiServer => ({
  plugins: {
    elasticsearch: {
      getCluster: (cluster: string) => ({
        callWithInternalUser: mockCallWithInternal,
      }),
    },
    xpack_main: {},
    taskManager: {
      registerTaskDefinitions: (opts: any) => undefined,
      schedule: (opts: any) => Promise.resolve(),
      fetch: mockTaskFetch,
    } as any,
  },
  usage: {
    collectorSet: {
      makeUsageCollector: () => '',
      register: () => undefined,
    },
  },
  config: () => ({ get: () => '' }),
  log: () => undefined,
});
