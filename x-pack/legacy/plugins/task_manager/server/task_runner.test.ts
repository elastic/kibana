/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import sinon from 'sinon';
import { minutesFromNow } from './lib/intervals';
import { asOk, asErr } from './lib/result_type';
import { TaskEvent, asTaskRunEvent, asTaskMarkRunningEvent } from './task_events';
import { ConcreteTaskInstance, TaskStatus } from './task';
import { TaskManagerRunner } from './task_runner';
import { mockLogger } from './test_utils';
import { SavedObjectsErrorHelpers } from '../../../../../src/core/server';

let fakeTimer: sinon.SinonFakeTimers;

beforeAll(() => {
  fakeTimer = sinon.useFakeTimers();
});

afterAll(() => fakeTimer.restore());

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

  test('reschedules tasks that have an schedule', async () => {
    const { runner, store } = testOpts({
      instance: {
        schedule: { interval: '10m' },
        status: TaskStatus.Running,
        startedAt: new Date(),
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

  test('tasks that return runAt override the schedule', async () => {
    const runAt = minutesFromNow(_.random(5));
    const { runner, store } = testOpts({
      instance: {
        schedule: { interval: '20m' },
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
        schedule: undefined,
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
              const promise = new Promise(r => setTimeout(r, 1000));
              fakeTimer.tick(1000);
              await promise;
            },
            async cancel() {
              wasCancelled = true;
            },
          }),
        },
      },
    });

    const promise = runner.run();
    await Promise.resolve();
    await runner.cancel();
    await promise;

    expect(wasCancelled).toBeTruthy();
    expect(logger.warn).not.toHaveBeenCalled();
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

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn.mock.calls[0][0]).toMatchInlineSnapshot(
      `"The task bar \\"foo\\" is not cancellable."`
    );
  });

  test('sets startedAt, status, attempts and retryAt when claiming a task', async () => {
    const timeoutMinutes = 1;
    const id = _.random(1, 20).toString();
    const initialAttempts = _.random(0, 2);
    const { runner, store } = testOpts({
      instance: {
        id,
        attempts: initialAttempts,
        schedule: undefined,
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

    await runner.markTaskAsRunning();

    sinon.assert.calledOnce(store.update);
    const instance = store.update.args[0][0];

    expect(instance.attempts).toEqual(initialAttempts + 1);
    expect(instance.status).toBe('running');
    expect(instance.startedAt.getTime()).toEqual(Date.now());
    expect(instance.retryAt.getTime()).toEqual(
      minutesFromNow((initialAttempts + 1) * 5).getTime() + timeoutMinutes * 60 * 1000
    );
  });

  test('uses getRetry function (returning date) on error when defined', async () => {
    const initialAttempts = _.random(1, 3);
    const nextRetry = new Date(Date.now() + _.random(15, 100) * 1000);
    const id = Date.now().toString();
    const getRetryStub = sinon.stub().returns(nextRetry);
    const error = new Error('Dangit!');
    const { runner, store } = testOpts({
      instance: {
        id,
        attempts: initialAttempts,
      },
      definitions: {
        bar: {
          getRetry: getRetryStub,
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
    sinon.assert.calledWith(getRetryStub, initialAttempts, error);
    const instance = store.update.args[0][0];

    expect(instance.runAt.getTime()).toEqual(nextRetry.getTime());
  });

  test('uses getRetry function (returning true) on error when defined', async () => {
    const initialAttempts = _.random(1, 3);
    const id = Date.now().toString();
    const getRetryStub = sinon.stub().returns(true);
    const error = new Error('Dangit!');
    const { runner, store } = testOpts({
      instance: {
        id,
        attempts: initialAttempts,
      },
      definitions: {
        bar: {
          getRetry: getRetryStub,
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
    sinon.assert.calledWith(getRetryStub, initialAttempts, error);
    const instance = store.update.args[0][0];

    const expectedRunAt = new Date(Date.now() + initialAttempts * 5 * 60 * 1000);
    expect(instance.runAt.getTime()).toEqual(expectedRunAt.getTime());
  });

  test('uses getRetry function (returning false) on error when defined', async () => {
    const initialAttempts = _.random(1, 3);
    const id = Date.now().toString();
    const getRetryStub = sinon.stub().returns(false);
    const error = new Error('Dangit!');
    const { runner, store } = testOpts({
      instance: {
        id,
        attempts: initialAttempts,
      },
      definitions: {
        bar: {
          getRetry: getRetryStub,
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
    sinon.assert.calledWith(getRetryStub, initialAttempts, error);
    const instance = store.update.args[0][0];

    expect(instance.status).toBe('failed');
  });

  test('bypasses getRetry function (returning false) on error of a recurring task', async () => {
    const initialAttempts = _.random(1, 3);
    const id = Date.now().toString();
    const getRetryStub = sinon.stub().returns(false);
    const error = new Error('Dangit!');
    const { runner, store } = testOpts({
      instance: {
        id,
        attempts: initialAttempts,
        schedule: { interval: '1m' },
        startedAt: new Date(),
      },
      definitions: {
        bar: {
          getRetry: getRetryStub,
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
    sinon.assert.notCalled(getRetryStub);
    const instance = store.update.args[0][0];

    const nextIntervalDelay = 60000; // 1m
    const expectedRunAt = new Date(Date.now() + nextIntervalDelay);
    expect(instance.runAt.getTime()).toEqual(expectedRunAt.getTime());
  });

  test('uses getRetry (returning date) to set retryAt when defined', async () => {
    const id = _.random(1, 20).toString();
    const initialAttempts = _.random(1, 3);
    const nextRetry = new Date(Date.now() + _.random(15, 100) * 1000);
    const timeoutMinutes = 1;
    const getRetryStub = sinon.stub().returns(nextRetry);
    const { runner, store } = testOpts({
      instance: {
        id,
        attempts: initialAttempts,
        schedule: undefined,
      },
      definitions: {
        bar: {
          timeout: `${timeoutMinutes}m`,
          getRetry: getRetryStub,
          createTaskRunner: () => ({
            run: async () => undefined,
          }),
        },
      },
    });

    await runner.markTaskAsRunning();

    sinon.assert.calledOnce(store.update);
    sinon.assert.calledWith(getRetryStub, initialAttempts + 1);
    const instance = store.update.args[0][0];

    expect(instance.retryAt.getTime()).toEqual(
      new Date(nextRetry.getTime() + timeoutMinutes * 60 * 1000).getTime()
    );
  });

  test('it returns false when markTaskAsRunning fails due to VERSION_CONFLICT_STATUS', async () => {
    const id = _.random(1, 20).toString();
    const initialAttempts = _.random(1, 3);
    const nextRetry = new Date(Date.now() + _.random(15, 100) * 1000);
    const timeoutMinutes = 1;
    const getRetryStub = sinon.stub().returns(nextRetry);
    const { runner, store } = testOpts({
      instance: {
        id,
        attempts: initialAttempts,
        schedule: undefined,
      },
      definitions: {
        bar: {
          timeout: `${timeoutMinutes}m`,
          getRetry: getRetryStub,
          createTaskRunner: () => ({
            run: async () => undefined,
          }),
        },
      },
    });

    store.update = sinon
      .stub()
      .throws(
        SavedObjectsErrorHelpers.decorateConflictError(new Error('repo error')).output.payload
      );

    expect(await runner.markTaskAsRunning()).toEqual(false);
  });

  test('it throw when markTaskAsRunning fails for unexpected reasons', async () => {
    const id = _.random(1, 20).toString();
    const initialAttempts = _.random(1, 3);
    const nextRetry = new Date(Date.now() + _.random(15, 100) * 1000);
    const timeoutMinutes = 1;
    const getRetryStub = sinon.stub().returns(nextRetry);
    const { runner, store } = testOpts({
      instance: {
        id,
        attempts: initialAttempts,
        schedule: undefined,
      },
      definitions: {
        bar: {
          timeout: `${timeoutMinutes}m`,
          getRetry: getRetryStub,
          createTaskRunner: () => ({
            run: async () => undefined,
          }),
        },
      },
    });

    store.update = sinon
      .stub()
      .throws(SavedObjectsErrorHelpers.createGenericNotFoundError('type', 'id').output.payload);

    return expect(runner.markTaskAsRunning()).rejects.toMatchInlineSnapshot(`
              Object {
                "error": "Not Found",
                "message": "Saved object [type/id] not found",
                "statusCode": 404,
              }
            `);
  });

  test('uses getRetry (returning true) to set retryAt when defined', async () => {
    const id = _.random(1, 20).toString();
    const initialAttempts = _.random(1, 3);
    const timeoutMinutes = 1;
    const getRetryStub = sinon.stub().returns(true);
    const { runner, store } = testOpts({
      instance: {
        id,
        attempts: initialAttempts,
        schedule: undefined,
      },
      definitions: {
        bar: {
          timeout: `${timeoutMinutes}m`,
          getRetry: getRetryStub,
          createTaskRunner: () => ({
            run: async () => undefined,
          }),
        },
      },
    });

    await runner.markTaskAsRunning();

    sinon.assert.calledOnce(store.update);
    sinon.assert.calledWith(getRetryStub, initialAttempts + 1);
    const instance = store.update.args[0][0];

    const attemptDelay = (initialAttempts + 1) * 5 * 60 * 1000;
    const timeoutDelay = timeoutMinutes * 60 * 1000;
    expect(instance.retryAt.getTime()).toEqual(
      new Date(Date.now() + attemptDelay + timeoutDelay).getTime()
    );
  });

  test('uses getRetry (returning false) to set retryAt when defined', async () => {
    const id = _.random(1, 20).toString();
    const initialAttempts = _.random(1, 3);
    const timeoutMinutes = 1;
    const getRetryStub = sinon.stub().returns(false);
    const { runner, store } = testOpts({
      instance: {
        id,
        attempts: initialAttempts,
        schedule: undefined,
      },
      definitions: {
        bar: {
          timeout: `${timeoutMinutes}m`,
          getRetry: getRetryStub,
          createTaskRunner: () => ({
            run: async () => undefined,
          }),
        },
      },
    });

    await runner.markTaskAsRunning();

    sinon.assert.calledOnce(store.update);
    sinon.assert.calledWith(getRetryStub, initialAttempts + 1);
    const instance = store.update.args[0][0];

    expect(instance.retryAt).toBeNull();
    expect(instance.status).toBe('running');
  });

  test('bypasses getRetry (returning false) of a recurring task to set retryAt when defined', async () => {
    const id = _.random(1, 20).toString();
    const initialAttempts = _.random(1, 3);
    const timeoutMinutes = 1;
    const getRetryStub = sinon.stub().returns(false);
    const { runner, store } = testOpts({
      instance: {
        id,
        attempts: initialAttempts,
        schedule: { interval: '1m' },
        startedAt: new Date(),
      },
      definitions: {
        bar: {
          timeout: `${timeoutMinutes}m`,
          getRetry: getRetryStub,
          createTaskRunner: () => ({
            run: async () => undefined,
          }),
        },
      },
    });

    await runner.markTaskAsRunning();

    sinon.assert.calledOnce(store.update);
    sinon.assert.notCalled(getRetryStub);
    const instance = store.update.args[0][0];

    const timeoutDelay = timeoutMinutes * 60 * 1000;
    expect(instance.retryAt.getTime()).toEqual(new Date(Date.now() + timeoutDelay).getTime());
  });

  test('Fails non-recurring task when maxAttempts reached', async () => {
    const id = _.random(1, 20).toString();
    const initialAttempts = 3;
    const { runner, store } = testOpts({
      instance: {
        id,
        attempts: initialAttempts,
        schedule: undefined,
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
    const intervalSeconds = 10;
    const { runner, store } = testOpts({
      instance: {
        id,
        attempts: initialAttempts,
        schedule: { interval: `${intervalSeconds}s` },
        startedAt: new Date(),
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
    expect(instance.runAt.getTime()).toEqual(
      new Date(Date.now() + intervalSeconds * 1000).getTime()
    );
  });

  describe('TaskEvents', () => {
    test('emits TaskEvent when a task is marked as running', async () => {
      const id = _.random(1, 20).toString();
      const onTaskEvent = jest.fn();
      const { runner, instance, store } = testOpts({
        onTaskEvent,
        instance: {
          id,
        },
        definitions: {
          bar: {
            timeout: `1m`,
            getRetry: () => {},
            createTaskRunner: () => ({
              run: async () => undefined,
            }),
          },
        },
      });

      store.update.returns(instance);

      await runner.markTaskAsRunning();

      expect(onTaskEvent).toHaveBeenCalledWith(asTaskMarkRunningEvent(id, asOk(instance)));
    });

    test('emits TaskEvent when a task fails to be marked as running', async () => {
      expect.assertions(2);

      const id = _.random(1, 20).toString();
      const onTaskEvent = jest.fn();
      const { runner, store } = testOpts({
        onTaskEvent,
        instance: {
          id,
        },
        definitions: {
          bar: {
            timeout: `1m`,
            getRetry: () => {},
            createTaskRunner: () => ({
              run: async () => undefined,
            }),
          },
        },
      });

      store.update.throws(new Error('cant mark as running'));

      try {
        await runner.markTaskAsRunning();
      } catch (err) {
        expect(onTaskEvent).toHaveBeenCalledWith(asTaskMarkRunningEvent(id, asErr(err)));
      }
      expect(onTaskEvent).toHaveBeenCalledTimes(1);
    });

    test('emits TaskEvent when a task is run successfully', async () => {
      const id = _.random(1, 20).toString();
      const onTaskEvent = jest.fn();
      const { runner, instance } = testOpts({
        onTaskEvent,
        instance: {
          id,
        },
        definitions: {
          bar: {
            createTaskRunner: () => ({
              async run() {
                return {};
              },
            }),
          },
        },
      });

      await runner.run();

      expect(onTaskEvent).toHaveBeenCalledWith(asTaskRunEvent(id, asOk(instance)));
    });

    test('emits TaskEvent when a recurring task is run successfully', async () => {
      const id = _.random(1, 20).toString();
      const runAt = minutesFromNow(_.random(5));
      const onTaskEvent = jest.fn();
      const { runner, instance } = testOpts({
        onTaskEvent,
        instance: {
          id,
          schedule: { interval: '1m' },
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

      expect(onTaskEvent).toHaveBeenCalledWith(asTaskRunEvent(id, asOk(instance)));
    });

    test('emits TaskEvent when a task run throws an error', async () => {
      const id = _.random(1, 20).toString();
      const error = new Error('Dangit!');
      const onTaskEvent = jest.fn();
      const { runner } = testOpts({
        onTaskEvent,
        instance: {
          id,
        },
        definitions: {
          bar: {
            createTaskRunner: () => ({
              async run() {
                throw error;
              },
            }),
          },
        },
      });
      await runner.run();

      expect(onTaskEvent).toHaveBeenCalledWith(asTaskRunEvent(id, asErr(error)));
      expect(onTaskEvent).toHaveBeenCalledTimes(1);
    });

    test('emits TaskEvent when a task run returns an error', async () => {
      const id = _.random(1, 20).toString();
      const error = new Error('Dangit!');
      const onTaskEvent = jest.fn();
      const { runner } = testOpts({
        onTaskEvent,
        instance: {
          id,
          schedule: { interval: '1m' },
          startedAt: new Date(),
        },
        definitions: {
          bar: {
            createTaskRunner: () => ({
              async run() {
                return { error };
              },
            }),
          },
        },
      });

      await runner.run();

      expect(onTaskEvent).toHaveBeenCalledWith(asTaskRunEvent(id, asErr(error)));
      expect(onTaskEvent).toHaveBeenCalledTimes(1);
    });

    test('emits TaskEvent when a task returns an error and is marked as failed', async () => {
      const id = _.random(1, 20).toString();
      const error = new Error('Dangit!');
      const onTaskEvent = jest.fn();
      const { runner, store } = testOpts({
        onTaskEvent,
        instance: {
          id,
          startedAt: new Date(),
        },
        definitions: {
          bar: {
            getRetry: () => false,
            createTaskRunner: () => ({
              async run() {
                return { error };
              },
            }),
          },
        },
      });

      await runner.run();

      const instance = store.update.args[0][0];
      expect(instance.status).toBe('failed');

      expect(onTaskEvent).toHaveBeenCalledWith(asTaskRunEvent(id, asErr(error)));
      expect(onTaskEvent).toHaveBeenCalledTimes(1);
    });
  });

  interface TestOpts {
    instance?: Partial<ConcreteTaskInstance>;
    definitions?: any;
    onTaskEvent?: (event: TaskEvent<any, any>) => void;
  }

  function testOpts(opts: TestOpts) {
    const callCluster = sinon.stub();
    const createTaskRunner = sinon.stub();
    const logger = mockLogger();

    const instance = Object.assign(
      {
        id: 'foo',
        taskType: 'bar',
        sequenceNumber: 32,
        primaryTerm: 32,
        runAt: new Date(),
        scheduledAt: new Date(),
        startedAt: null,
        retryAt: null,
        attempts: 0,
        params: {},
        scope: ['reporting'],
        state: {},
        status: 'idle',
        user: 'example',
        ownerId: null,
      },
      opts.instance || {}
    );

    const store = {
      update: sinon.stub(),
      remove: sinon.stub(),
      maxAttempts: 5,
    };

    store.update.returns(instance);

    const runner = new TaskManagerRunner({
      beforeRun: context => Promise.resolve(context),
      beforeMarkRunning: context => Promise.resolve(context),
      logger,
      store,
      instance,
      definitions: Object.assign(opts.definitions || {}, {
        testbar: {
          type: 'bar',
          title: 'Bar!',
          createTaskRunner,
        },
      }),
      onTaskEvent: opts.onTaskEvent,
    });

    return {
      callCluster,
      createTaskRunner,
      runner,
      logger,
      store,
      instance,
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
      expect(logger.warn).not.toHaveBeenCalled();
    } else {
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn.mock.calls[0][0]).toMatch(/invalid task result/i);
    }
  }

  function allowsReturnType(result: any) {
    return testReturn(result, true);
  }

  function disallowsReturnType(result: any) {
    return testReturn(result, false);
  }
});
