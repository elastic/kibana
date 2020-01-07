/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TaskManager } from './types';

export const taskManagerMock = {
  create() {
    const mocked: jest.Mocked<TaskManager> = {
      registerTaskDefinitions: jest.fn(),
      addMiddleware: jest.fn(),
      ensureScheduled: jest.fn(),
      schedule: jest.fn(),
      fetch: jest.fn(),
      runNow: jest.fn(),
      remove: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
    };
    return mocked;
  },
};
