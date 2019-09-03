/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESQueryResponse, HapiServer, SavedObjectDoc, TaskInstance } from '../';

export const getMockTaskInstance = (): TaskInstance => ({ state: { runs: 0, stats: {} } });

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

export const getMockConfig = () => {
  return {
    get: () => '',
  };
};

export const getMockKbnServer = (
  mockCallWithInternal = getMockCallWithInternal(),
  mockTaskFetch = getMockTaskFetch(),
  mockConfig = getMockConfig()
): HapiServer => ({
  plugins: {
    elasticsearch: {
      getCluster: (cluster: string) => ({
        callWithInternalUser: mockCallWithInternal,
      }),
    },
    xpack_main: {},
    task_manager: {
      registerTaskDefinitions: (opts: any) => undefined,
      schedule: (opts: any) => Promise.resolve(),
      fetch: mockTaskFetch,
    },
  },
  usage: {
    collectorSet: {
      makeUsageCollector: () => '',
      register: () => undefined,
    },
  },
  config: () => mockConfig,
  log: () => undefined,
});
