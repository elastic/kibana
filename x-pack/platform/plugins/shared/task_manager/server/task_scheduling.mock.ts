/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskScheduling } from './task_scheduling';

const createTaskSchedulingMock = () => {
  return {
    bulkDisable: jest.fn(),
    bulkEnable: jest.fn(),
    ensureScheduled: jest.fn(),
    schedule: jest.fn(),
    runSoon: jest.fn(),
    ephemeralRunNow: jest.fn(),
  } as unknown as jest.Mocked<TaskScheduling>;
};

export const taskSchedulingMock = {
  create: createTaskSchedulingMock,
};
