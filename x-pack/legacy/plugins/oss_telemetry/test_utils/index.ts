/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'kibana/server';

import { TaskInstance } from '../../task_manager';
import { PluginSetupContract as TaskManagerPluginSetupContract } from '../../task_manager/plugin';

export const getMockTaskInstance = (): TaskInstance => ({
  state: { runs: 0, stats: {} },
  taskType: 'test',
  params: {},
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

export const getMockEs = (mockCallWithInternal: any = getMockCallWithInternal()) =>
  (({
    createClient: () => ({ callAsInternalUser: mockCallWithInternal }),
  } as unknown) as CoreSetup['elasticsearch']);

export const getMockCallWithInternal = (hits: any[] = defaultMockSavedObjects) => {
  return (): Promise<any> => {
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

export const getMockTaskManager = (fetch: any = getMockTaskFetch()) =>
  (({
    registerTaskDefinitions: (opts: any) => undefined,
    ensureScheduled: (opts: any) => Promise.resolve(),
    fetch,
  } as unknown) as TaskManagerPluginSetupContract);

export const getCluster = (cluster: string) => ({
  callWithInternalUser: getMockCallWithInternal(),
});

export const getMockCollectorSet = () => ({
  makeUsageCollector: () => '',
  register: () => undefined,
});
