/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller, CoreSetup } from 'kibana/server';

import {
  ConcreteTaskInstance,
  TaskStatus,
  TaskManagerStartContract,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../plugins/task_manager/server';

export const getMockTaskInstance = (
  overrides: Partial<ConcreteTaskInstance> = {}
): ConcreteTaskInstance => ({
  state: { runs: 0, stats: {} },
  taskType: 'test',
  params: {},
  id: '',
  scheduledAt: new Date(),
  attempts: 1,
  status: TaskStatus.Idle,
  runAt: new Date(),
  startedAt: null,
  retryAt: null,
  ownerId: null,
  ...overrides,
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

export const getMockTaskFetch = (
  docs: ConcreteTaskInstance[] = defaultMockTaskDocs
): Partial<jest.Mocked<TaskManagerStartContract>> => {
  return {
    fetch: jest.fn(fetchOpts => {
      return Promise.resolve({ docs, searchAfter: [] });
    }),
  } as Partial<jest.Mocked<TaskManagerStartContract>>;
};

export const getMockThrowingTaskFetch = (
  throws: Error
): Partial<jest.Mocked<TaskManagerStartContract>> => {
  return {
    fetch: jest.fn(fetchOpts => {
      throw throws;
    }),
  } as Partial<jest.Mocked<TaskManagerStartContract>>;
};

export const getMockConfig = () => {
  return {
    get: () => '',
  };
};

export const getCluster = () => ({
  callWithInternalUser: getMockCallWithInternal(),
});
