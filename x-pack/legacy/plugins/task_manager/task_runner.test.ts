/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import sinon from 'sinon';
import { minutesFromNow } from './lib/intervals';
import { ConcreteTaskInstance } from './task';
import { TaskManagerRunner } from './task_runner';

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
        testtype: {
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
    expect(instance.attempts).toEqual(initialAttempts + 1);
    expect(instance.runAt.getTime()).toBeGreaterThan(Date.now());
    expect(instance.params).toEqual({ a: 'b' });
    expect(instance.state).toEqual({ hey: 'there' });
  });

  test('reschedules tasks that have an interval', async () => {
    const { runner, store } = testOpts({
      instance: {
        interval: '10m',
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
        testType: {
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
          runAt: new Date(),
          scheduledAt: new Date(),
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
