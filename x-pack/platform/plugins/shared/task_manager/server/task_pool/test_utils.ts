/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import { asOk } from '../lib/result_type';
import { sleep } from '../test_utils';
import { TaskRunningStage } from '../task_running';
import { TaskCost } from '../task';

export function mockRun() {
  return jest.fn(async () => {
    await sleep(0);
    return asOk({ state: {} });
  });
}

export function mockTask(overrides = {}, definitionOverrides = {}) {
  return {
    isExpired: false,
    taskExecutionId: uuidv4(),
    id: uuidv4(),
    cancel: async () => undefined,
    markTaskAsRunning: jest.fn(async () => true),
    run: mockRun(),
    stage: TaskRunningStage.PENDING,
    toString: () => `TaskType "shooooo"`,
    isAdHocTaskAndOutOfAttempts: false,
    removeTask: jest.fn(),
    get expiration() {
      return new Date();
    },
    get startedAt() {
      return new Date();
    },
    get definition() {
      return {
        type: '',
        title: '',
        timeout: '5m',
        cost: TaskCost.Normal,
        createTaskRunner: jest.fn(),
        ...definitionOverrides,
      };
    },
    isSameTask() {
      return false;
    },
    ...overrides,
  };
}
