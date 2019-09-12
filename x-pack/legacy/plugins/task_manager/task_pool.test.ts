/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { TaskPool } from './task_pool';
import { mockLogger, resolvable, sleep } from './test_utils';

describe('TaskPool', () => {
  test('occupiedWorkers are a sum of running tasks', async () => {
    const pool = new TaskPool({
      maxWorkers: 200,
      logger: mockLogger(),
    });

    const result = await pool.run([{ ...mockTask() }, { ...mockTask() }, { ...mockTask() }]);

    expect(result).toBeTruthy();
    expect(pool.occupiedWorkers).toEqual(3);
  });

  test('availableWorkers are a function of total_capacity - occupiedWorkers', async () => {
    const pool = new TaskPool({
      maxWorkers: 10,
      logger: mockLogger(),
    });

    const result = await pool.run([{ ...mockTask() }, { ...mockTask() }, { ...mockTask() }]);

    expect(result).toBeTruthy();
    expect(pool.availableWorkers).toEqual(7);
  });

  test('does not run tasks that are beyond its available capacity', async () => {
    const pool = new TaskPool({
      maxWorkers: 2,
      logger: mockLogger(),
    });

    const shouldRun = mockRun();
    const shouldNotRun = mockRun();

    const result = await pool.run([
      { ...mockTask(), run: shouldRun },
      { ...mockTask(), run: shouldRun },
      { ...mockTask(), run: shouldNotRun },
    ]);

    expect(result).toBeFalsy();
    expect(pool.availableWorkers).toEqual(0);
    sinon.assert.calledTwice(shouldRun);
    sinon.assert.notCalled(shouldNotRun);
  });

  test('clears up capacity when a task completes', async () => {
    const pool = new TaskPool({
      maxWorkers: 1,
      logger: mockLogger(),
    });

    const firstWork = resolvable();
    const firstRun = sinon.spy(async () => {
      await sleep(0);
      firstWork.resolve();
      return { state: {} };
    });
    const secondWork = resolvable();
    const secondRun = sinon.spy(async () => {
      await sleep(0);
      secondWork.resolve();
      return { state: {} };
    });

    const result = await pool.run([
      { ...mockTask(), run: firstRun },
      { ...mockTask(), run: secondRun },
    ]);

    expect(result).toBeFalsy();
    expect(pool.occupiedWorkers).toEqual(1);
    expect(pool.availableWorkers).toEqual(0);

    await firstWork;
    sinon.assert.calledOnce(firstRun);
    sinon.assert.notCalled(secondRun);

    expect(pool.occupiedWorkers).toEqual(0);
    await pool.run([{ ...mockTask(), run: secondRun }]);
    expect(pool.occupiedWorkers).toEqual(1);

    expect(pool.availableWorkers).toEqual(0);

    await secondWork;

    expect(pool.occupiedWorkers).toEqual(0);
    expect(pool.availableWorkers).toEqual(1);
    sinon.assert.calledOnce(secondRun);
  });

  test('run cancels expired tasks prior to running new tasks', async () => {
    const pool = new TaskPool({
      maxWorkers: 2,
      logger: mockLogger(),
    });

    const expired = resolvable();
    const shouldRun = sinon.spy(() => Promise.resolve());
    const shouldNotRun = sinon.spy(() => Promise.resolve());
    const result = await pool.run([
      {
        ...mockTask(),
        async run() {
          this.isExpired = true;
          expired.resolve();
          await sleep(10);
          return {
            state: {},
          };
        },
        cancel: shouldRun,
      },
      {
        ...mockTask(),
        async run() {
          await sleep(10);
          return {
            state: {},
          };
        },
        cancel: shouldNotRun,
      },
    ]);

    expect(result).toBeTruthy();
    expect(pool.occupiedWorkers).toEqual(2);
    expect(pool.availableWorkers).toEqual(0);

    await expired;

    expect(await pool.run([{ ...mockTask() }])).toBeTruthy();
    sinon.assert.calledOnce(shouldRun);
    sinon.assert.notCalled(shouldNotRun);

    expect(pool.occupiedWorkers).toEqual(2);
    expect(pool.availableWorkers).toEqual(0);
  });

  test('logs if cancellation errors', async () => {
    const logger = mockLogger();
    const pool = new TaskPool({
      logger,
      maxWorkers: 20,
    });

    const cancelled = resolvable();
    const result = await pool.run([
      {
        ...mockTask(),
        async run() {
          this.isExpired = true;
          await sleep(10);
          return {
            state: {},
          };
        },
        async cancel() {
          cancelled.resolve();
          throw new Error('Dern!');
        },
        toString: () => '"shooooo!"',
      },
    ]);

    expect(result).toBeTruthy();
    await pool.run([]);

    expect(pool.occupiedWorkers).toEqual(0);

    // Allow the task to cancel...
    await cancelled;

    sinon.assert.calledWithMatch(logger.error, /Failed to cancel task "shooooo!"/);
  });

  function mockRun() {
    return sinon.spy(async () => {
      await sleep(0);
      return { state: {} };
    });
  }

  function mockTask() {
    return {
      isExpired: false,
      cancel: async () => undefined,
      claimOwnership: async () => true,
      run: mockRun(),
    };
  }
});
