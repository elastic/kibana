/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { of, Subject } from 'rxjs';
import { TaskCost } from '../task';
import { mockTask } from './test_utils';
import { WorkerCapacity } from './worker_capacity';

const logger = loggingSystemMock.create().get();

describe('WorkerCapacity', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('workers set based on capacity responds to changes from capacity$ observable', () => {
    const capacity$ = new Subject<number>();
    const pool = new WorkerCapacity({ capacity$, logger });

    expect(pool.capacity).toBe(0);

    capacity$.next(20);
    expect(pool.capacity).toBe(20);

    capacity$.next(16);
    expect(pool.capacity).toBe(16);

    capacity$.next(25);
    expect(pool.capacity).toBe(25);

    expect(logger.debug).toHaveBeenCalledTimes(3);
    expect(logger.debug).toHaveBeenNthCalledWith(
      1,
      'Task pool now using 20 as the max worker value which is based on a capacity of 20'
    );
    expect(logger.debug).toHaveBeenNthCalledWith(
      2,
      'Task pool now using 16 as the max worker value which is based on a capacity of 16'
    );
    expect(logger.debug).toHaveBeenNthCalledWith(
      3,
      'Task pool now using 25 as the max worker value which is based on a capacity of 25'
    );
  });

  test('usedCapacity returns the number of tasks in the pool', () => {
    const pool = new WorkerCapacity({ capacity$: of(10), logger });

    const tasksInPool = new Map([
      ['1', { ...mockTask() }],
      ['2', { ...mockTask({}, { cost: TaskCost.Tiny }) }],
      ['3', { ...mockTask() }],
    ]);

    expect(pool.usedCapacity(tasksInPool)).toBe(3);
  });

  test('usedCapacityPercentage returns the percentage of workers in use by tasks in the pool', () => {
    const pool = new WorkerCapacity({ capacity$: of(10), logger });

    const tasksInPool = new Map([
      ['1', { ...mockTask() }],
      ['2', { ...mockTask({}, { cost: TaskCost.Tiny }) }],
      ['3', { ...mockTask() }],
    ]);

    expect(pool.usedCapacityPercentage(tasksInPool)).toBe(30);
  });

  test('usedCapacityByType returns the number of tasks of specified type in the pool', () => {
    const pool = new WorkerCapacity({ capacity$: of(10), logger });

    const tasksInPool = [
      { ...mockTask({}, { type: 'type1' }) },
      { ...mockTask({}, { type: 'type1', cost: TaskCost.Tiny }) },
      { ...mockTask({}, { type: 'type2' }) },
    ];

    expect(pool.getUsedCapacityByType(tasksInPool, 'type1')).toBe(2);
    expect(pool.getUsedCapacityByType(tasksInPool, 'type2')).toBe(1);
    expect(pool.getUsedCapacityByType(tasksInPool, 'type3')).toBe(0);
  });

  test('availableCapacity returns the overall number of available workers when no task type is defined', () => {
    const pool = new WorkerCapacity({ capacity$: of(10), logger });

    const tasksInPool = new Map([
      ['1', { ...mockTask() }],
      ['2', { ...mockTask({}, { cost: TaskCost.Tiny }) }],
      ['3', { ...mockTask() }],
    ]);

    expect(pool.availableCapacity(tasksInPool)).toBe(7);
  });

  test('availableCapacity returns the overall number of available workers when task type with no maxConcurrency is provided', () => {
    const pool = new WorkerCapacity({ capacity$: of(10), logger });

    const tasksInPool = new Map([
      ['1', { ...mockTask() }],
      ['2', { ...mockTask({}, { cost: TaskCost.Tiny }) }],
      ['3', { ...mockTask() }],
    ]);

    expect(
      pool.availableCapacity(tasksInPool, {
        type: 'type1',
        cost: TaskCost.Normal,
        createTaskRunner: jest.fn(),
        timeout: '5m',
      })
    ).toBe(7);
  });

  test('availableCapacity returns the number of available workers for the task type when task type with maxConcurrency is provided', () => {
    const pool = new WorkerCapacity({ capacity$: of(10), logger });

    const tasksInPool = new Map([
      ['1', { ...mockTask({}, { type: 'type1' }) }],
      ['2', { ...mockTask({}, { cost: TaskCost.Tiny }) }],
      ['3', { ...mockTask() }],
    ]);

    expect(
      pool.availableCapacity(tasksInPool, {
        type: 'type1',
        maxConcurrency: 3,
        cost: TaskCost.Normal,
        createTaskRunner: jest.fn(),
        timeout: '5m',
      })
    ).toBe(2);
  });

  describe('determineTasksToRunBasedOnCapacity', () => {
    test('runs all tasks if there are workers available', () => {
      const pool = new WorkerCapacity({ capacity$: of(10), logger });
      const tasks = [{ ...mockTask() }, { ...mockTask() }, { ...mockTask() }];
      const [tasksToRun, leftoverTasks] = pool.determineTasksToRunBasedOnCapacity(tasks, 10);

      expect(tasksToRun).toEqual(tasks);
      expect(leftoverTasks).toEqual([]);
    });

    test('splits tasks if there are more tasks than available workers', () => {
      const pool = new WorkerCapacity({ capacity$: of(10), logger });
      const tasks = [
        { ...mockTask() },
        { ...mockTask() },
        { ...mockTask() },
        { ...mockTask({}, { cost: TaskCost.ExtraLarge }) },
        { ...mockTask({}, { cost: TaskCost.ExtraLarge }) },
        { ...mockTask() },
        { ...mockTask() },
      ];
      const [tasksToRun, leftoverTasks] = pool.determineTasksToRunBasedOnCapacity(tasks, 5);

      expect(tasksToRun).toEqual([tasks[0], tasks[1], tasks[2], tasks[3], tasks[4]]);
      expect(leftoverTasks).toEqual([tasks[5], tasks[6]]);
    });

    test('does not run tasks if there is no capacity', () => {
      const pool = new WorkerCapacity({ capacity$: of(10), logger });
      const tasks = [{ ...mockTask() }, { ...mockTask() }, { ...mockTask() }];
      const [tasksToRun, leftoverTasks] = pool.determineTasksToRunBasedOnCapacity(tasks, 0);

      expect(tasksToRun).toEqual([]);
      expect(leftoverTasks).toEqual(tasks);
    });
  });
});
