/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { TaskExecutionControlService, TaskExecutionControlState } from '.';
import { DEFAULT_EXECUTION_CONTROL_STATE } from '.';

export const taskExecutionControlServiceMock = {
  create: (initialState: TaskExecutionControlState = DEFAULT_EXECUTION_CONTROL_STATE) => {
    const state$ = new BehaviorSubject<TaskExecutionControlState>(initialState);
    return {
      state: state$,
      getState: jest.fn(() => state$.getValue()),
      isInitialized: jest.fn(() => true),
      start: jest.fn(async () => {}),
      read: jest.fn(async () => ({
        paused: state$.getValue().paused,
        paused_task_types: state$.getValue().pausedTaskTypes,
        updated_at: new Date(0).toISOString(),
      })),
      update: jest.fn(),
      stop: jest.fn(),
    } as unknown as jest.Mocked<TaskExecutionControlService>;
  },
};
