/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import sinon from 'sinon';
import { minutesFromNow, secondsFromNow } from './lib/intervals';
import { ConcreteTaskInstance } from './task';
import { TaskManagerRunner } from './task_runner';

const mockedNow = new Date('2019-06-03T18:55:25.982Z');
(global as any).Date = class Date extends global.Date {
  static now() {
    return mockedNow.getTime();
  }
};

describe('TaskManagerRunner', () => {
  test('provides details about the task that is running', () => {
    const { runner } = testOpts({
      instance: {
        id: 'foo',
        taskType: 'bar',
      },
    });

    expect(runner.id).toEqual('foo');
    expect(runner.taskType).toEqual('bar');
    expect(runner.toString()).toEqual('bar "foo"');
  });

  test('warns if the task returns an unexpected result', async () => {
    await allowsReturnType(undefined);
    await allowsReturnType({});
    await allowsReturnType({
      runAt: new Date(),
    });
    await allowsReturnType({
      error: new Error('Dang it!'),
    });
    await allowsReturnType({
      state: { shazm: true },
    });
    await disallowsReturnType('hm....');
    await disallowsReturnType({
      whatIsThis: '?!!?',
    });
  });

  test('queues a reattempt if the task fails', async () => {
    const initialAttempts = _.random(0, 2);
    const id = Date.now().toString();
    const { runner, store } = testOpts({
      instance: {
        id,
        attempts: initialAttempts,
        params: { a: 'b' },
        state: { hey: 'there' },
      },
      definitions: {
        bar: {
          createTaskRunner: () => ({
            async run() {
              throw new Error('Dangit!');
            },
          }),
        },
      },
    });

    await runner.run();

    sinon.assert.calledOnce(store.update);
    const instance = store.update.args[0][0];

    expect(instance.id).toEqual(id);
    expect(instance.runAt.getTime()).toEqual(minutesFromNow(initialAttempts * 5).getTime());
    expect(instance.params).toEqual({ a: 'b' });
    expect(instance.state).toEqual({ hey: 'there' });
  });

  test('reschedules tasks that have an interval', async () => {
    const { runner, store } = testOpts({
      instance: {
        interval: '10m',
        status: 'running',
        startedAt: new Date(Date.now()),
      },
      definitions: {
        bar: {
          createTaskRunner: () => ({
            async run() {
              return;
            },
          }),
        },
      },
    });

    await runner.run();

    sinon.assert.calledOnce(store.update);
    const instance = store.update.args[0][0];

    expect(instance.runAt.getTime()).toBeGreaterThan(minutesFromNow(9).getTime());
    expect(instance.runAt.getTime()).toBeLessThanOrEqual(minutesFromNow(10).getTime());
  });

  test('reschedules tasks that return a runAt', async () => {
    const runAt = minutesFromNow(_.random(1, 10));
    const { runner, store } = testOpts({
      definitions: {
        bar: {
          createTaskRunner: () => ({
            async run() {
              return { runAt };
            },
          }),
        },
      },
    });

    await runner.run();

    sinon.assert.calledOnce(store.update);
    sinon.assert.calledWithMatch(store.update, { runAt });
  });

  test('tasks that return runAt override interval', async () => {
    const runAt = minutesFromNow(_.random(5));
    const { runner, store } = testOpts({
      instance: {
        interval: '20m',
      },
      definitions: {
        bar: {
          createTaskRunner: () => ({
            async run() {
              return { runAt };
            },
          }),
        },
      },
    });

    await runner.run();

    sinon.assert.calledOnce(store.update);
    sinon.assert.calledWithMatch(store.update, { runAt });
  });

  test('removes non-recurring tasks after they complete', async () => {
    const id = _.random(1, 20).toString();
    const { runner, store } = testOpts({
      instance: {
        id,
        interval: undefined,
      },
      definitions: {
        bar: {
          createTaskRunner: () => ({
            async run() {
              return undefined;
            },
          }),
        },
      },
    });

    await runner.run();

    sinon.assert.calledOnce(store.remove);
    sinon.assert.calledWith(store.remove, id);
  });

  test('cancel cancels the task runner, if it is cancellable', async () => {
    let wasCancelled = false;
    const { runner, logger } = testOpts({
      definitions: {
        bar: {
          createTaskRunner: () => ({
            async run() {
              await new Promise(r => setTimeout(r, 1000));
            },
            async cancel() {
              wasCancelled = true;
            },
          }),
        },
      },
    });

    const promise = runner.run();
    await new Promise(r => setInterval(r, 1));
    await runner.cancel();
    await promise;

    expect(wasCancelled).toBeTruthy();
    sinon.assert.neverCalledWithMatch(logger.warning, /not cancellable/);
  });

  test('warns if cancel is called on a non-cancellable task', async () => {
    const { runner, logger } = testOpts({
      definitions: {
        bar: {
          createTaskRunner: () => ({
            run: async () => undefined,
          }),
        },
      },
    });

    const promise = runner.run();
    await runner.cancel();
    await promise;

    sinon.assert.calledWithMatch(logger.warning, /not cancellable/);
  });

  test('sets startedAt, status, attempts and retryAt when claiming a task', async () => {
    const timeoutMinutes = 1;
    const id = _.random(1, 20).toString();
    const initialAttempts = _.random(0, 2);
    const { runner, store } = testOpts({
      instance: {
        id,
        attempts: initialAttempts,
        interval: undefined,
      },
      definitions: {
        bar: {
          timeout: `${timeoutMinutes}m`,
          createTaskRunner: () => ({
            run: async () => undefined,
          }),
        },
      },
    });

    await runner.claimOwnership();

    sinon.assert.calledOnce(store.update);
    const instance = store.update.args[0][0];

    expect(instance.attempts).toEqual(initialAttempts + 1);
    expect(instance.status).toBe('running');
    expect(instance.startedAt.getTime()).toEqual(Date.now());
    expect(instance.retryAt.getTime()).toEqual(
      minutesFromNow((initialAttempts + 1) * 5).getTime() + timeoutMinutes * 60 * 1000
    );
  });

  test('uses getRetryDelay function on error when defined', async () => {
    const initialAttempts = _.random(0, 2);
    const retryDelay = _.random(15, 100);
    const id = Date.now().toString();
    const getRetryDelayStub = sinon.stub().returns(retryDelay);
    const error = new Error('Dangit!');
    const { runner, store } = testOpts({
      instance: {
        id,
        attempts: initialAttempts,
      },
      definitions: {
        bar: {
          getRetryDelay: getRetryDelayStub,
          createTaskRunner: () => ({
            async run() {
              throw error;
            },
          }),
        },
      },
    });

    await runner.run();

    sinon.assert.calledOnce(store.update);
    sinon.assert.calledWith(getRetryDelayStub, initialAttempts, error);
    const instance = store.update.args[0][0];

    expect(Math.abs(secondsFromNow(retryDelay).getTime() - instance.runAt.getTime())).toBeLessThan(
      100
    );
  });

  test('uses getRetryDelay to set retryAt when defined', async () => {
    const id = _.random(1, 20).toString();
    const initialAttempts = _.random(0, 2);
    const retryDelay = _.random(15, 100);
    const timeoutMinutes = 1;
    const getRetryDelayStub = sinon.stub().returns(retryDelay);
    const { runner, store } = testOpts({
      instance: {
        id,
        attempts: initialAttempts,
        interval: undefined,
      },
      definitions: {
        bar: {
          timeout: `${timeoutMinutes}m`,
          getRetryDelay: getRetryDelayStub,
          createTaskRunner: () => ({
            run: async () => undefined,
          }),
        },
      },
    });

    await runner.claimOwnership();

    sinon.assert.calledOnce(store.update);
    sinon.assert.calledWith(getRetryDelayStub, initialAttempts + 1);
    const instance = store.update.args[0][0];

    expect(instance.retryAt.getTime()).toEqual(
      secondsFromNow(retryDelay).getTime() + timeoutMinutes * 60 * 1000
    );
  });

  test('Fails non-recurring task when maxAttempts reached', async () => {
    const id = _.random(1, 20).toString();
    const initialAttempts = 3;
    const { runner, store } = testOpts({
      instance: {
        id,
        attempts: initialAttempts,
        interval: undefined,
      },
      definitions: {
        bar: {
          maxAttempts: 3,
          createTaskRunner: () => ({
            run: async () => {
              throw new Error();
            },
          }),
        },
      },
    });

    await runner.run();

    sinon.assert.calledOnce(store.update);
    const instance = store.update.args[0][0];
    expect(instance.attempts).toEqual(3);
    expect(instance.status).toEqual('failed');
    expect(instance.retryAt).toBeNull();
    expect(instance.runAt.getTime()).toBeLessThanOrEqual(Date.now());
  });

  test(`Doesn't fail recurring tasks when maxAttempts reached`, async () => {
    const id = _.random(1, 20).toString();
    const initialAttempts = 3;
    const { runner, store } = testOpts({
      instance: {
        id,
        attempts: initialAttempts,
        interval: '10s',
      },
      definitions: {
        bar: {
          maxAttempts: 3,
          createTaskRunner: () => ({
            run: async () => {
              throw new Error();
            },
          }),
        },
      },
    });

    await runner.run();

    sinon.assert.calledOnce(store.update);
    const instance = store.update.args[0][0];
    expect(instance.attempts).toEqual(3);
    expect(instance.status).toEqual('idle');
    expect(instance.runAt.getTime()).toEqual(minutesFromNow(15).getTime());
  });

  interface TestOpts {
    instance?: Partial<ConcreteTaskInstance>;
    definitions?: any;
  }

  function testOpts(opts: TestOpts) {
    const callCluster = sinon.stub();
    const createTaskRunner = sinon.stub();
    const logger = {
      error: sinon.stub(),
      debug: sinon.stub(),
      info: sinon.stub(),
      warning: sinon.stub(),
    };
    const store = {
      update: sinon.stub(),
      remove: sinon.stub(),
      maxAttempts: 5,
    };
    const runner = new TaskManagerRunner({
      kbnServer: sinon.stub(),
      beforeRun: context => Promise.resolve(context),
      logger,
      store,
      instance: Object.assign(
        {
          id: 'foo',
          taskType: 'bar',
          sequenceNumber: 32,
          primaryTerm: 32,
          runAt: new Date(Date.now()),
          scheduledAt: new Date(Date.now()),
          startedAt: null,
          retryAt: null,
          attempts: 0,
          params: {},
          scope: ['reporting'],
          state: {},
          status: 'idle',
          user: 'example',
        },
        opts.instance || {}
      ),
      definitions: Object.assign(opts.definitions || {}, {
        testbar: {
          type: 'bar',
          title: 'Bar!',
          createTaskRunner,
        },
      }),
    });

    return {
      callCluster,
      createTaskRunner,
      runner,
      logger,
      store,
    };
  }

  async function testReturn(result: any, shouldBeValid: boolean) {
    const { runner, logger } = testOpts({
      definitions: {
        bar: {
          createTaskRunner: () => ({
            run: async () => result,
          }),
        },
      },
    });

    await runner.run();

    if (shouldBeValid) {
      sinon.assert.notCalled(logger.warning);
    } else {
      sinon.assert.calledWith(logger.warning, sinon.match(/invalid task result/i));
    }
  }

  function allowsReturnType(result: any) {
    return testReturn(result, true);
  }

  function disallowsReturnType(result: any) {
    return testReturn(result, false);
  }
});
