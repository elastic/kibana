/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createTaskStoreUpdateBuffer, BatchUpdatable } from './task_store_buffer';
import { ConcreteTaskInstance } from './task';
import { asOk, asErr } from './lib/result_type';
import { BulkUpdateTaskFailureResult } from './task_store';

const createTask = (function(): () => ConcreteTaskInstance {
  let counter = 0;
  return () => ({
    id: `task ${++counter}`,
    taskType: '',
    attempts: 1,
    params: { a: 'b' },
    state: { hey: 'there' },
    scheduledAt: new Date(),
    status: 'idle',
    runAt: new Date(),
    startedAt: null,
    retryAt: null,
    ownerId: null,
  });
})();

function incrementAttempts(task: ConcreteTaskInstance): ConcreteTaskInstance {
  return {
    ...task,
    attempts: task.attempts + 1,
  };
}

function errorAttempts(task: ConcreteTaskInstance): BulkUpdateTaskFailureResult {
  return {
    task: incrementAttempts(task),
    error: { message: 'Oh no, something went terribly wrong', statusCode: 500 },
  };
}

describe('Task Store Buffer', () => {
  describe('createTaskStoreUpdateBuffer()', () => {
    test('acts as a proxy to the store', async () => {
      const mockStore: BatchUpdatable = {
        maxAttempts: 5,
        update: jest.fn(task => Promise.resolve(incrementAttempts(task))),
        bulkUpdate: jest.fn(tasks => Promise.resolve(tasks.map(incrementAttempts).map(asOk))),
        remove: jest.fn(),
      };

      const buffer = createTaskStoreUpdateBuffer(mockStore);

      expect(buffer.maxAttempts).toEqual(mockStore.maxAttempts);

      await buffer.remove('id');
      expect(mockStore.remove).toHaveBeenCalledWith('id');
    });

    test('batches up multiple update calls', async () => {
      const mockStore: BatchUpdatable = {
        maxAttempts: 5,
        update: jest.fn(task => Promise.resolve(incrementAttempts(task))),
        bulkUpdate: jest.fn(([task1, task2]) => {
          return Promise.resolve([incrementAttempts(task1), incrementAttempts(task2)].map(asOk));
        }),
        remove: jest.fn(),
      };

      const buffer = createTaskStoreUpdateBuffer(mockStore);

      const task1 = createTask();
      const task2 = createTask();

      expect(await Promise.all([buffer.update(task1), buffer.update(task2)])).toMatchObject([
        incrementAttempts(task1),
        incrementAttempts(task2),
      ]);
      expect(mockStore.bulkUpdate).toHaveBeenCalledWith([task1, task2]);
    });

    test('batch updates are executed at most by the next Event Loop tick', async done => {
      const mockStore: BatchUpdatable = {
        maxAttempts: 5,
        update: jest.fn(task => Promise.resolve(incrementAttempts(task))),
        bulkUpdate: jest.fn(([task1, task2]) => {
          return Promise.resolve([incrementAttempts(task1), incrementAttempts(task2)].map(asOk));
        }),
        remove: jest.fn(),
      };

      const buffer = createTaskStoreUpdateBuffer(mockStore);

      const task1 = createTask();
      const task2 = createTask();
      const task3 = createTask();
      const task4 = createTask();
      const task5 = createTask();
      const task6 = createTask();

      Promise.all([buffer.update(task1), buffer.update(task2)]).then(_ => {
        expect(mockStore.bulkUpdate).toHaveBeenCalledTimes(1);
        expect(mockStore.bulkUpdate).toHaveBeenCalledWith([task1, task2]);
        expect(mockStore.bulkUpdate).not.toHaveBeenCalledWith([task3, task4]);
      });
      setTimeout(() => {
        expect(mockStore.bulkUpdate).toHaveBeenCalledTimes(1);

        setTimeout(() => {
          expect(mockStore.bulkUpdate).toHaveBeenCalledTimes(2);
          Promise.all([buffer.update(task5), buffer.update(task6)]).then(_ => {
            expect(mockStore.bulkUpdate).toHaveBeenCalledTimes(3);
            expect(mockStore.bulkUpdate).toHaveBeenCalledWith([task5, task6]);
            done();
          });
        }, 0);

        Promise.all([buffer.update(task3), buffer.update(task4)]).then(_ => {
          expect(mockStore.bulkUpdate).toHaveBeenCalledTimes(2);
          expect(mockStore.bulkUpdate).toHaveBeenCalledWith([task3, task4]);
        });
      }, 0);
    });

    test('handles both resolutions and rejections at individual task level', async done => {
      const mockStore: BatchUpdatable = {
        maxAttempts: 5,
        update: jest.fn(task => Promise.resolve(incrementAttempts(task))),
        bulkUpdate: jest.fn(([task1, task2, task3]) => {
          return Promise.resolve([
            asOk(incrementAttempts(task1)),
            asErr(errorAttempts(task2)),
            asOk(incrementAttempts(task3)),
          ]);
        }),
        remove: jest.fn(),
      };

      const buffer = createTaskStoreUpdateBuffer(mockStore);

      const task1 = createTask();
      const task2 = createTask();
      const task3 = createTask();

      return Promise.all([
        expect(buffer.update(task1)).resolves.toMatchObject(incrementAttempts(task1)),
        expect(buffer.update(task2)).rejects.toMatchObject(errorAttempts(task2)),
        expect(buffer.update(task3)).resolves.toMatchObject(incrementAttempts(task3)),
      ]).then(() => {
        expect(mockStore.bulkUpdate).toHaveBeenCalledTimes(1);
        done();
      });
    });

    test('handles bulkUpdate failure', async done => {
      const mockStore: BatchUpdatable = {
        maxAttempts: 5,
        update: jest.fn(task => Promise.resolve(incrementAttempts(task))),
        bulkUpdate: jest.fn(() => {
          return Promise.reject(new Error('bulkUpdate is an illusion'));
        }),
        remove: jest.fn(),
      };

      const buffer = createTaskStoreUpdateBuffer(mockStore);

      const task1 = createTask();
      const task2 = createTask();
      const task3 = createTask();

      return Promise.all([
        expect(buffer.update(task1)).rejects.toMatchInlineSnapshot(
          `[Error: bulkUpdate is an illusion]`
        ),
        expect(buffer.update(task2)).rejects.toMatchInlineSnapshot(
          `[Error: bulkUpdate is an illusion]`
        ),
        expect(buffer.update(task3)).rejects.toMatchInlineSnapshot(
          `[Error: bulkUpdate is an illusion]`
        ),
      ]).then(() => {
        expect(mockStore.bulkUpdate).toHaveBeenCalledTimes(1);
        done();
      });
    });
  });
});
