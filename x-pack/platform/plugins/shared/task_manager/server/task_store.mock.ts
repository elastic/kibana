/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { TaskStore } from './task_store';

interface TaskStoreOptions {
  index?: string;
  taskManagerId?: string;
  stateVersion?: number;
}
export const taskStoreMock = {
  create({ index = '', taskManagerId = '', stateVersion }: TaskStoreOptions = {}) {
    const mocked = {
      taskValidator: {
        getValidatedTaskInstanceFromReading: jest.fn().mockImplementation((task) => task),
        getValidatedTaskInstanceForUpdating: jest
          .fn()
          .mockImplementation((task) => ({ ...task, ...(stateVersion ? { stateVersion } : {}) })),
      },
      convertToSavedObjectIds: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      schedule: jest.fn(),
      bulkSchedule: jest.fn(),
      bulkUpdate: jest.fn(),
      bulkPartialUpdate: jest.fn(),
      bulkRemove: jest.fn(),
      get: jest.fn(),
      taskExists: jest.fn().mockResolvedValue(false),
      // Mirrors the real predicate for a security-enabled deployment; override to simulate
      // deployments where no keys are granted (e.g. security disabled).
      willGrantApiKeys: jest
        .fn()
        .mockImplementation((options?: Parameters<TaskStore['willGrantApiKeys']>[0]) =>
          Boolean(options?.request)
        ),
      getLifecycle: jest.fn(),
      fetch: jest.fn(),
      aggregate: jest.fn(),
      updateByQuery: jest.fn(),
      bulkGet: jest.fn(),
      bulkGetVersions: jest.fn(),
      getDocVersions: jest.fn(),
      search: jest.fn(),
      msearch: jest.fn(),
      index,
      taskManagerId,
      errors$: of(),
    } as unknown as jest.Mocked<TaskStore>;
    return mocked;
  },
};
