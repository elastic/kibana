/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TaskManager } from './types';

const createTaskManagerMock = () => {
  const mocked: jest.Mocked<TaskManager> = {
    registerTaskDefinitions: jest.fn(),
    addMiddleware: jest.fn(),
    schedule: jest.fn(),
    fetch: jest.fn(),
    remove: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };
  return mocked;
};

export const taskManagerMock = {
  create: createTaskManagerMock,
};
