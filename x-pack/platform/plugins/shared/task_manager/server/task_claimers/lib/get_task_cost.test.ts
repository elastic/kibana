/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { getTaskCost } from './get_task_cost';
import type { ConcreteTaskInstance } from '../../task';
import { TaskCost, InstanceTaskCost } from '../../task';
import { TaskTypeDictionary } from '../../task_type_dictionary';
import { mockLogger } from '../../test_utils';

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
  limitedTaskTypeWithCost: {
    title: 'Limited Concurrency Task Type with Cost',
    cost: TaskCost.Tiny,
    createTaskRunner: jest.fn(),
  },
  taskType1: {
    title: 'Task Type 1',
    createTaskRunner: jest.fn(),
  },
});

describe('getTaskCost', () => {
  it('returns instance cost when set', () => {
    const task = mockInstance({
      taskType: 'limitedTaskTypeWithCost',
      cost: InstanceTaskCost.ExtraLarge,
    });
    expect(getTaskCost(task, taskDefinitions)).toBe(TaskCost.ExtraLarge);
  });

  it('returns definition cost when instance cost is not set', () => {
    const task = mockInstance({ taskType: 'limitedTaskTypeWithCost' });
    expect(getTaskCost(task, taskDefinitions)).toBe(TaskCost.Tiny);
  });

  it('returns TaskCost.Normal for type without definition cost', () => {
    const task = mockInstance({ taskType: 'taskType1' });
    expect(getTaskCost(task, taskDefinitions)).toBe(TaskCost.Normal);
  });

  it('returns instance cost when set for type without definition cost', () => {
    const task = mockInstance({
      taskType: 'taskType1',
      cost: InstanceTaskCost.ExtraLarge,
    });
    expect(getTaskCost(task, taskDefinitions)).toBe(TaskCost.ExtraLarge);
  });
});
