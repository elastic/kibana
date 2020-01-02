/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller, CoreSetup } from 'kibana/server';

import { TaskInstance } from '../../task_manager/server';
import { PluginContract as TaskManagerPluginSetupContract } from '../../task_manager/server/plugin';

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

export const getMockEs = (mockCallWithInternal: APICaller = getMockCallWithInternal()) =>
  (({
    createClient: () => ({ callAsInternalUser: mockCallWithInternal }),
  } as unknown) as CoreSetup['elasticsearch']);

export const getMockCallWithInternal = (hits: unknown[] = defaultMockSavedObjects): APICaller => {
  return ((() => {
    return Promise.resolve({ hits: { hits } });
  }) as unknown) as APICaller;
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
    registerTaskDefinitions: () => undefined,
    ensureScheduled: () => Promise.resolve(),
    fetch,
  } as unknown) as TaskManagerPluginSetupContract);

export const getCluster = () => ({
  callWithInternalUser: getMockCallWithInternal(),
});
