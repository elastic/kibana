/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { asLimited, asUnlimited } from '../../queries/task_claiming';
import { selectTasksByCapacity } from './task_selector_by_capacity';
import type { ConcreteTaskInstance } from '../../task';
import { TaskTypeDictionary } from '../../task_type_dictionary';
import { mockLogger } from '../../test_utils';

jest.mock('../../constants', () => ({
  CONCURRENCY_ALLOW_LIST_BY_TASK_TYPE: [
    'limitedTaskType',
    'sampleTaskSharedConcurrencyType1',
    'sampleTaskSharedConcurrencyType2',
  ],
}));

const taskManagerLogger = mockLogger();
function mockInstance(instance: Partial<ConcreteTaskInstance> = {}) {
  return Object.assign(
    {
      id: uuidv4(),
      taskType: 'bar',
      sequenceNumber: 32,
      primaryTerm: 32,
      runAt: new Date(),
      scheduledAt: new Date(),
      startedAt: null,
      retryAt: null,
      attempts: 0,
      params: {},
      scope: ['scope'],
      state: {},
      status: 'idle',
      user: 'example',
      ownerId: null,
      traceparent: '',
    },
    instance
  );
}

const taskDefinitions = new TaskTypeDictionary(taskManagerLogger);
taskDefinitions.registerTaskDefinitions({
  limitedTaskType: {
    title: 'Limited Concurrency Task Type',
    maxConcurrency: 1,
    createTaskRunner: jest.fn(),
  },
  taskType1: {
    title: 'dernstraight',
    createTaskRunner: jest.fn(),
  },
  taskType2: {
    title: 'yawn',
    createTaskRunner: jest.fn(),
  },
  sampleTaskSharedConcurrencyType1: {
    title: 'Shared Concurrency Task Type 1',
    maxConcurrency: 2,
    createTaskRunner: jest.fn(),
  },
  sampleTaskSharedConcurrencyType2: {
    title: 'Shared Concurrency Task Type 2',
    maxConcurrency: 2,
    createTaskRunner: jest.fn(),
  },
});

describe('selectTasksByCapacity', () => {
  it('should limit tasks by concurrency if limited', () => {
    const batches = [
      asLimited('limitedTaskType'),
      asUnlimited(new Set(['taskType1', 'taskType2'])),
    ];
    const tasks = [
      mockInstance({ id: `id-1`, taskType: 'limitedTaskType' }),
      mockInstance({ id: `id-2`, taskType: 'limitedTaskType' }),
    ];

    expect(selectTasksByCapacity({ definitions: taskDefinitions, tasks, batches })).toEqual([
      tasks[0],
    ]);
  });

  it('should not limit tasks by concurrency if unlimited', () => {
    const batches = [
      asLimited('limitedTaskType'),
      asUnlimited(new Set(['taskType1', 'taskType2'])),
    ];
    const tasks = [
      mockInstance({ id: `id-0`, taskType: 'taskType1' }),
      mockInstance({ id: `id-1`, taskType: 'taskType1' }),
      mockInstance({ id: `id-2`, taskType: 'taskType2' }),
      mockInstance({ id: `id-3`, taskType: 'taskType1' }),
      mockInstance({ id: `id-4`, taskType: 'taskType1' }),
      mockInstance({ id: `id-5`, taskType: 'taskType1' }),
      mockInstance({ id: `id-6`, taskType: 'taskType2' }),
      mockInstance({ id: `id-7`, taskType: 'taskType2' }),
      mockInstance({ id: `id-8`, taskType: 'taskType1' }),
      mockInstance({ id: `id-9`, taskType: 'taskType1' }),
    ];
    expect(selectTasksByCapacity({ definitions: taskDefinitions, tasks, batches })).toEqual(tasks);
  });

  it('should limit tasks by shared concurrency if limited', () => {
    const batches = [
      asLimited('sampleTaskSharedConcurrencyType1'),
      asLimited('sampleTaskSharedConcurrencyType2'),
      asUnlimited(new Set(['taskType1', 'taskType2'])),
    ];
    const tasks = [
      mockInstance({ id: `id-1`, taskType: 'sampleTaskSharedConcurrencyType1' }),
      mockInstance({ id: `id-2`, taskType: 'sampleTaskSharedConcurrencyType2' }),
      mockInstance({ id: `id-3`, taskType: 'sampleTaskSharedConcurrencyType1' }),
    ];

    expect(selectTasksByCapacity({ definitions: taskDefinitions, tasks, batches })).toEqual([
      tasks[0],
      tasks[1],
    ]);
  });
});
