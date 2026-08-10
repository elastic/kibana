/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { Global } from '@kbn/core-di-internal';
import { Request } from '@kbn/core-di-server';
import type { CoreDiServiceStart } from '@kbn/core-di';
import type { RunContext, RunResult } from '@kbn/task-manager-plugin/server/task';
import { createTaskRunnerFactory, type AlertingTaskRunner } from './create_task_runner';

class TestTaskRunner implements AlertingTaskRunner {
  public async run(): Promise<RunResult> {
    return { state: {} };
  }
}

const flushMicrotasks = () => new Promise<void>((resolve) => setImmediate(resolve));

const createMockScope = (runner: AlertingTaskRunner) => {
  const scopeBinding = {
    inRequestScope: jest.fn(),
    inTransientScope: jest.fn(),
  };
  const bindResult = {
    toConstantValue: jest.fn(),
    toSelf: jest.fn().mockReturnValue(scopeBinding),
  };

  return {
    bind: jest.fn().mockReturnValue(bindResult),
    get: jest.fn().mockReturnValue(runner),
    unbindAllAsync: jest.fn().mockResolvedValue(undefined),
    _scopeBinding: scopeBinding,
  };
};

const createMockInjection = (scope: ReturnType<typeof createMockScope>): CoreDiServiceStart =>
  ({
    fork: jest.fn().mockReturnValue(scope),
    getContainer: jest.fn(),
  } as unknown as CoreDiServiceStart);

const createRunContext = (overrides: Partial<RunContext> = {}): RunContext =>
  ({
    taskInstance: { id: 'task-1' },
    signal: new AbortController().signal,
    ...overrides,
  } as unknown as RunContext);

describe('createTaskRunnerFactory', () => {
  it('waits for the injection promise to resolve before forking the container', async () => {
    let resolveInjection!: (value: CoreDiServiceStart) => void;
    const injectionPromise = new Promise<CoreDiServiceStart>((resolve) => {
      resolveInjection = resolve;
    });

    const runner = new TestTaskRunner();
    const scope = createMockScope(runner);
    const injection = createMockInjection(scope);

    const createTaskRunner = createTaskRunnerFactory({ injectionPromise })({
      taskRunnerClass: TestTaskRunner,
      taskType: 'test',
      requiresFakeRequest: false,
    });

    const runPromise = createTaskRunner(createRunContext()).run();

    // The plugin has not started yet, so the container must not be forked.
    await flushMicrotasks();
    expect(injection.fork).not.toHaveBeenCalled();

    resolveInjection(injection);
    await runPromise;

    expect(injection.fork).toHaveBeenCalledTimes(1);
  });

  it('rejects without forking when the run is already aborted', async () => {
    const abortController = new AbortController();
    abortController.abort();

    const scope = createMockScope(new TestTaskRunner());
    const injection = createMockInjection(scope);
    const injectionPromise = Promise.resolve(injection);

    const createTaskRunner = createTaskRunnerFactory({ injectionPromise })({
      taskRunnerClass: TestTaskRunner,
      taskType: 'test',
      requiresFakeRequest: false,
    });

    await expect(
      createTaskRunner(createRunContext({ signal: abortController.signal })).run()
    ).rejects.toThrow(
      'Aborted test task while waiting for the alerting_v2 plugin to start (task id: task-1)'
    );
    expect(injection.fork).not.toHaveBeenCalled();
  });

  it('rejects without forking when the run is aborted before the plugin starts', async () => {
    let resolveInjection!: (value: CoreDiServiceStart) => void;
    const injectionPromise = new Promise<CoreDiServiceStart>((resolve) => {
      resolveInjection = resolve;
    });
    const abortController = new AbortController();

    const scope = createMockScope(new TestTaskRunner());
    const injection = createMockInjection(scope);

    const createTaskRunner = createTaskRunnerFactory({ injectionPromise })({
      taskRunnerClass: TestTaskRunner,
      taskType: 'test',
      requiresFakeRequest: false,
    });

    const runPromise = createTaskRunner(createRunContext({ signal: abortController.signal })).run();

    abortController.abort();

    await expect(runPromise).rejects.toThrow(
      'Aborted test task while waiting for the alerting_v2 plugin to start (task id: task-1)'
    );
    expect(injection.fork).not.toHaveBeenCalled();

    // A late-resolving injection (after abort) must not resurrect the run.
    resolveInjection(injection);
    await flushMicrotasks();
    expect(injection.fork).not.toHaveBeenCalled();
  });

  it('throws when a fakeRequest is required but not provided, without resolving the injection', async () => {
    const injectionPromise = Promise.resolve(
      createMockInjection(createMockScope(new TestTaskRunner()))
    );

    const createTaskRunner = createTaskRunnerFactory({ injectionPromise })({
      taskRunnerClass: TestTaskRunner,
      taskType: 'my-task',
      requiresFakeRequest: true,
    });

    await expect(createTaskRunner(createRunContext()).run()).rejects.toThrow(
      'Cannot execute my-task task without Task Manager fakeRequest. Ensure the task is scheduled with an API key (task id: task-1)'
    );
  });

  it('binds the fakeRequest into a request scope and runs the task runner', async () => {
    const runResult: RunResult = { state: { foo: 'bar' } };
    const runner = new TestTaskRunner();
    jest.spyOn(runner, 'run').mockResolvedValue(runResult);

    const scope = createMockScope(runner);
    const injectionPromise = Promise.resolve(createMockInjection(scope));
    const fakeRequest = httpServerMock.createKibanaRequest();
    const runContext = createRunContext({ fakeRequest });

    const createTaskRunner = createTaskRunnerFactory({ injectionPromise })({
      taskRunnerClass: TestTaskRunner,
      taskType: 'test',
      requiresFakeRequest: true,
    });

    const result = await createTaskRunner(runContext).run();

    expect(scope.bind).toHaveBeenCalledWith(Request);
    expect(scope.bind).toHaveBeenCalledWith(Global);
    expect(scope.bind).toHaveBeenCalledWith(TestTaskRunner);
    expect(scope._scopeBinding.inRequestScope).toHaveBeenCalledTimes(1);
    expect(scope._scopeBinding.inTransientScope).not.toHaveBeenCalled();
    expect(runner.run).toHaveBeenCalledWith({
      taskInstance: runContext.taskInstance,
      signal: runContext.signal,
    });
    expect(result).toEqual(runResult);
    expect(scope.unbindAllAsync).toHaveBeenCalledTimes(1);
  });

  it('binds the task runner in a transient scope when a fakeRequest is not required', async () => {
    const runner = new TestTaskRunner();
    const scope = createMockScope(runner);
    const injectionPromise = Promise.resolve(createMockInjection(scope));

    const createTaskRunner = createTaskRunnerFactory({ injectionPromise })({
      taskRunnerClass: TestTaskRunner,
      taskType: 'test',
      requiresFakeRequest: false,
    });

    await createTaskRunner(createRunContext()).run();

    expect(scope.bind).not.toHaveBeenCalledWith(Request);
    expect(scope.bind).toHaveBeenCalledWith(TestTaskRunner);
    expect(scope._scopeBinding.inTransientScope).toHaveBeenCalledTimes(1);
    expect(scope._scopeBinding.inRequestScope).not.toHaveBeenCalled();
    expect(scope.unbindAllAsync).toHaveBeenCalledTimes(1);
  });

  it('unbinds the scope even when the task runner throws', async () => {
    const runner = new TestTaskRunner();
    const failure = new Error('boom');
    jest.spyOn(runner, 'run').mockRejectedValue(failure);

    const scope = createMockScope(runner);
    const injectionPromise = Promise.resolve(createMockInjection(scope));

    const createTaskRunner = createTaskRunnerFactory({ injectionPromise })({
      taskRunnerClass: TestTaskRunner,
      taskType: 'test',
      requiresFakeRequest: false,
    });

    await expect(createTaskRunner(createRunContext()).run()).rejects.toThrow(failure);
    expect(scope.unbindAllAsync).toHaveBeenCalledTimes(1);
  });
});
