/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TASK_PROCESS_CAPABILITIES,
  TASK_PROCESS_PROTOCOL_VERSION,
  TASK_PROCESS_PATHS,
} from './protocol';
import { isDeclinedRunError, isRetryableError, isUnrecoverableError } from '../task_running/errors';
import { TaskProcessAcquireError } from './acquire_error';
import { RemoteTaskRunner } from './remote_task_runner';
import type { TaskProcessLease } from './remote_task_runner';
import type { TaskFeatureFlagDefinitions } from './feature_flag_declarations';
import { elasticsearchConfigFromEnv } from './es_config';
import type { TaskProcessDispatchSnapshot } from './wire';

const withProtocol =
  (fetchFn: typeof fetch): typeof fetch =>
  async (input, init) =>
    String(input).endsWith(TASK_PROCESS_PATHS.health)
      ? new Response(
          JSON.stringify({
            protocolVersion: TASK_PROCESS_PROTOCOL_VERSION,
            capabilities: TASK_PROCESS_CAPABILITIES,
          }),
          { status: 200 }
        )
      : fetchFn(input, init);

describe('RemoteTaskRunner dispatch', () => {
  const request = { taskType: 'alerting:test', taskInstance: {}, executionUuid: 'u' };
  const create = (fetchFn: unknown, extra = {}) => {
    const onDispatchFailure = jest.fn();
    const runner = new RemoteTaskRunner({
      route: { url: 'http://process' },
      request,
      timeoutMs: 1000,
      setCustomTaskRunEventFields: jest.fn(),
      onDispatchFailure,
      fetchFn: withProtocol(fetchFn as typeof fetch),
      ...extra,
    });
    return { runner, onDispatchFailure };
  };

  it('evaluates contributed SDK flags in Main for every dispatch and forwards the same remote snapshot', async () => {
    let enabled = false;
    const declared = { 'sdk.enabled': false, 'sdk.mode': 'true' };
    const snapshot: TaskProcessDispatchSnapshot = {
      protocolVersion: TASK_PROCESS_PROTOCOL_VERSION,
      init: {
        kibanaVersion: '9.9.9',
        elasticsearch: elasticsearchConfigFromEnv({
          ES_URL: 'http://es:9200',
          ES_USERNAME: 'test',
          ES_PASSWORD: 'test',
        }),
      },
      featureFlags: { old: true },
    };
    const dispatched: Array<{
      featureFlags: TaskFeatureFlagDefinitions;
      snapshot: TaskProcessDispatchSnapshot;
    }> = [];
    const getFeatureFlags = jest.fn(
      async (_type: string, defaults: TaskFeatureFlagDefinitions = {}) => ({
        ...defaults,
        'sdk.enabled': enabled,
      })
    );
    const fetchFn = jest.fn(
      async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
        if (String(input).includes(TASK_PROCESS_PATHS.featureFlags)) {
          expect(init?.headers).toEqual({ authorization: 'Bearer worker-token' });
          return new Response(
            JSON.stringify({ taskType: request.taskType, featureFlags: declared })
          );
        }
        if (String(input).endsWith(TASK_PROCESS_PATHS.run)) {
          dispatched.push(JSON.parse(String(init?.body)));
        }
        return new Response(
          JSON.stringify({ kind: 'result', result: { state: {} }, reusable: true })
        );
      }
    );
    for (enabled of [false, true]) {
      const { runner } = create(fetchFn, {
        route: { url: 'http://process', token: 'worker-token' },
        request: { ...request, snapshot },
        getFeatureFlags,
      });
      await runner.run();
    }
    expect(getFeatureFlags.mock.calls).toEqual([
      [request.taskType, declared],
      [request.taskType, declared],
    ]);
    expect(dispatched.map(({ featureFlags }) => featureFlags)).toEqual([
      { ...declared, 'sdk.enabled': false },
      { ...declared, 'sdk.enabled': true },
    ]);
    expect(dispatched.map(({ snapshot: forwarded }) => forwarded.featureFlags)).toEqual(
      dispatched.map(({ featureFlags }) => featureFlags)
    );
    expect(snapshot.featureFlags).toEqual({ old: true });
  });

  it('refuses business dispatch when Main omits a contributed SDK flag', async () => {
    const fetchFn = jest.fn(
      async () =>
        new Response(
          JSON.stringify({ taskType: request.taskType, featureFlags: { 'sdk.enabled': false } })
        )
    );
    const { runner, onDispatchFailure } = create(fetchFn, {
      getFeatureFlags: jest.fn().mockResolvedValue({}),
    });
    await expect(runner.run()).rejects.toThrow('Main did not evaluate native task feature flags');
    expect(onDispatchFailure).toHaveBeenCalledWith(
      request.taskType,
      'incompatible',
      expect.stringContaining('sdk.enabled')
    );
    expect(fetchFn.mock.calls).toHaveLength(1);
  });

  it('stops before dispatch when cancelled while Main is evaluating SDK flags', async () => {
    const entered = Promise.withResolvers<void>();
    const pending = Promise.withResolvers<TaskFeatureFlagDefinitions>();
    const control = new AbortController();
    const fetchFn = jest.fn(
      async (input: Parameters<typeof fetch>[0]) =>
        new Response(
          JSON.stringify(
            String(input).includes(TASK_PROCESS_PATHS.cancel)
              ? { outcome: 'cancelled' }
              : { taskType: request.taskType, featureFlags: { 'sdk.enabled': false } }
          )
        )
    );
    const { runner } = create(fetchFn, {
      signal: control.signal,
      getFeatureFlags: async () => {
        entered.resolve();
        return pending.promise;
      },
    });
    const running = runner.run();
    await entered.promise;
    control.abort();
    await expect(running).rejects.toMatchObject({ name: 'AbortError' });
    pending.resolve({ 'sdk.enabled': true });
    expect(
      fetchFn.mock.calls.some(([input]) => String(input).endsWith(TASK_PROCESS_PATHS.run))
    ).toBe(false);
  });

  it('does not dispatch after cancellation while protocol negotiation is pending', async () => {
    const health = Promise.withResolvers<Response>();
    const fetchFn = jest.fn(async (input: Parameters<typeof fetch>[0]) => {
      if (String(input).endsWith(TASK_PROCESS_PATHS.health)) return health.promise;
      return new Response(JSON.stringify({ outcome: 'cancelled' }), { status: 200 });
    });
    const { runner } = create(fetchFn, { fetchFn });
    const running = runner.run();
    await runner.cancel();
    health.resolve(
      new Response(
        JSON.stringify({
          protocolVersion: TASK_PROCESS_PROTOCOL_VERSION,
          capabilities: TASK_PROCESS_CAPABILITIES,
        }),
        { status: 200 }
      )
    );
    await expect(running).rejects.toThrow('cancelled before dispatch');
    expect(
      fetchFn.mock.calls.some(([input]) => String(input).endsWith(TASK_PROCESS_PATHS.run))
    ).toBe(false);
  });

  it('force-releases a child on cancellation without waiting for its HTTP response', async () => {
    let finish: (value: unknown) => void = () => undefined;
    const fetchFn = jest.fn(() => new Promise((resolve) => (finish = resolve)));
    const release = jest.fn();
    const { runner } = create(fetchFn, {
      route: { acquire: async () => ({ url: 'http://child', release }) },
    });
    const run = runner.run();
    await new Promise((resolve) => setImmediate(resolve));
    await runner.cancel();
    expect(release).toHaveBeenCalledWith({ force: true });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    finish({
      ok: true,
      status: 200,
      json: async () => ({ kind: 'result', result: { state: {} } }),
    });
    await run;
  });

  it('allows a task to acknowledge persisted cancellation before terminating its worker', async () => {
    let finish: (response: object) => void = () => {};
    let acknowledge: (response: object) => void = () => {};
    const running = new Promise<object>((resolve) => (finish = resolve));
    const acknowledgement = new Promise<object>((resolve) => (acknowledge = resolve));
    const fetchFn = jest.fn((url: string) => (url.endsWith('/run') ? running : acknowledgement));
    const release = jest.fn();
    const onTasksCreated = jest.fn();
    const { runner } = create(fetchFn, {
      route: { acquire: async () => ({ url: 'http://child', release }) },
      request: { ...request, cancelGracePeriodMs: 1000 },
      onTasksCreated,
    });
    const run = runner.run();
    await new Promise((resolve) => setImmediate(resolve));
    const cancellation = runner.cancel();
    expect(release).not.toHaveBeenCalled();
    acknowledge({ ok: true, json: async () => ({ outcome: 'cancelled', createdTaskCount: 4 }) });
    await cancellation;
    expect(release).toHaveBeenCalledWith({ force: true });
    expect(onTasksCreated).toHaveBeenCalledWith(4);
    finish({ ok: true, json: async () => ({ kind: 'result', result: { state: {} } }) });
    await run;
  });

  it('cancels a run while its worker is starting without dispatching it', async () => {
    let acquired: (lease: TaskProcessLease) => void = () => {};
    const pendingLease = new Promise<TaskProcessLease>((resolve) => (acquired = resolve));
    const fetchFn = jest.fn();
    const release = jest.fn();
    const { runner } = create(fetchFn, { route: { acquire: () => pendingLease } });
    const run = runner.run();
    await runner.cancel();
    acquired({ url: 'http://child', release });
    await expect(run).rejects.toThrow('cancelled');
    expect(fetchFn).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalledWith({ force: true });
  });

  it.each([true, false, undefined])(
    'retains a child only with an explicit reusable response (%s)',
    async (reusable) => {
      const release = jest.fn();
      const { runner } = create(
        jest.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ kind: 'result', result: { state: {} }, reusable }),
        }),
        { route: { acquire: async () => ({ url: 'http://child', release }) } }
      );
      await runner.run();
      expect(release).toHaveBeenCalledWith({ reusable: reusable === true });
    }
  );

  it('fails without retrying when the process lacks a capability', async () => {
    const onTasksCreated = jest.fn();
    const fetchFn = jest.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        kind: 'declined',
        createdTaskCount: 2,
        reason: 'The task process lacks connectorTypes [.x]',
      }),
    });
    const { runner, onDispatchFailure } = create(fetchFn, { onTasksCreated });
    const error = await runner.run().catch((failure: Error) => failure);
    expect(error).toBeInstanceOf(Error);
    expect(isUnrecoverableError(error as Error)).toBe(true);
    expect(isDeclinedRunError(error)).toBe(true);
    expect(error).toHaveProperty('message', expect.stringContaining('lacks connectorTypes [.x]'));
    expect(onDispatchFailure).toHaveBeenCalledWith(
      'alerting:test',
      'declined',
      'The task process lacks connectorTypes [.x]'
    );
    expect(onTasksCreated).toHaveBeenCalledWith(2);
  });

  it('retries once with every pack when a worker dispatched with a narrowed selection declines', async () => {
    const dispatchedBodies: Array<{ snapshot?: TaskProcessDispatchSnapshot }> = [];
    const fetchFn = jest.fn(
      async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
        if (String(input).endsWith(TASK_PROCESS_PATHS.run)) {
          dispatchedBodies.push(JSON.parse(String(init?.body)));
          if (dispatchedBodies.length === 1) {
            return new Response(
              JSON.stringify({
                kind: 'declined',
                createdTaskCount: 0,
                reason: 'The task process lacks connectorTypes [.slack2]',
              }),
              { status: 422 }
            );
          }
        }
        return new Response(
          JSON.stringify({ kind: 'result', result: { state: {} }, reusable: true })
        );
      }
    );
    const snapshot: TaskProcessDispatchSnapshot = {
      protocolVersion: TASK_PROCESS_PROTOCOL_VERSION,
      init: {
        kibanaVersion: '9.9.9',
        elasticsearch: elasticsearchConfigFromEnv({
          ES_URL: 'http://es:9200',
          ES_USERNAME: 'test',
          ES_PASSWORD: 'test',
        }),
        packs: ['workflow-steps:slack'],
      },
    };
    const { runner, onDispatchFailure } = create(fetchFn, {
      request: { ...request, snapshot },
    });

    const result = await runner.run();

    expect(result).toEqual({ state: {} });
    expect(dispatchedBodies).toHaveLength(2);
    expect(dispatchedBodies[0].snapshot?.init.packs).toEqual(['workflow-steps:slack']);
    expect(dispatchedBodies[1].snapshot?.init.packs).toBeUndefined();
    // The declined attempt is still reported, so Main's incomplete pack resolution is visible.
    expect(onDispatchFailure).toHaveBeenCalledWith(
      'alerting:test',
      'declined',
      expect.stringContaining('lacks connectorTypes [.slack2]')
    );
    expect(onDispatchFailure).toHaveBeenCalledTimes(1);
  });

  it('does not retry a decline when the worker already had every pack (no narrowed selection)', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        kind: 'declined',
        createdTaskCount: 0,
        reason: 'The task process lacks connectorTypes [.x]',
      }),
    });
    const { runner, onDispatchFailure } = create(fetchFn, {
      request: {
        ...request,
        snapshot: {
          protocolVersion: TASK_PROCESS_PROTOCOL_VERSION,
          init: {
            kibanaVersion: '9.9.9',
            elasticsearch: elasticsearchConfigFromEnv({
              ES_URL: 'http://es:9200',
              ES_USERNAME: 'test',
              ES_PASSWORD: 'test',
            }),
          },
        } as TaskProcessDispatchSnapshot,
      },
    });

    const error = await runner.run().catch((failure: Error) => failure);

    expect(isDeclinedRunError(error)).toBe(true);
    const runCalls = fetchFn.mock.calls.filter(([input]) =>
      String(input).endsWith(TASK_PROCESS_PATHS.run)
    );
    expect(runCalls).toHaveLength(1);
    expect(onDispatchFailure).toHaveBeenCalledTimes(1);
  });

  it('reports receiver-side flag incompatibility as a permanent dispatch failure', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        kind: 'incompatible',
        reason: 'Main did not evaluate native task feature flags: sdk.enabled',
      }),
    });
    const { runner, onDispatchFailure } = create(fetchFn);
    await expect(runner.run()).rejects.toThrow('sdk.enabled');
    expect(onDispatchFailure).toHaveBeenCalledWith(
      'alerting:test',
      'incompatible',
      'Main did not evaluate native task feature flags: sdk.enabled'
    );
  });

  it('reports a process that does not serve the task type', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ ok: false, status: 404, body: null });
    const { runner, onDispatchFailure } = create(fetchFn);
    const error = await runner.run().catch((failure: Error) => failure);
    expect(isUnrecoverableError(error as Error)).toBe(true);
    expect(onDispatchFailure).toHaveBeenCalledWith(
      'alerting:test',
      'not_served',
      expect.stringContaining('404')
    );
  });

  it('reports a process that could not be started', async () => {
    const { runner, onDispatchFailure } = create(jest.fn(), {
      route: { acquire: jest.fn().mockRejectedValue(new Error('boom')) },
    });
    const error = await runner.run().catch((failure: Error) => failure);
    expect(isRetryableError(error as Error)).toBeInstanceOf(Date);
    expect(onDispatchFailure).toHaveBeenCalledWith(
      'alerting:test',
      'unavailable',
      'the process could not be started: boom'
    );
  });

  it('reports the reason an acquire error carries', async () => {
    const { runner, onDispatchFailure } = create(jest.fn(), {
      route: {
        acquire: jest.fn().mockRejectedValue(new TaskProcessAcquireError('capacity', 'full')),
      },
    });
    const error = await runner.run().catch((failure: Error) => failure);
    expect(isRetryableError(error as Error)).toBeInstanceOf(Date);
    expect(onDispatchFailure).toHaveBeenCalledWith(
      'alerting:test',
      'capacity',
      'the process could not be started: full'
    );
  });
});

describe('RemoteTaskRunner observer', () => {
  const request = { taskType: 'alerting:test', taskInstance: {}, executionUuid: 'u' };
  const answer = (body: unknown) =>
    jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body });
  const create = (fetchFn: unknown, observer = { onResult: jest.fn(), onCancel: jest.fn() }) => ({
    observer,
    runner: new RemoteTaskRunner({
      route: { url: 'http://process' },
      request,
      timeoutMs: 1000,
      setCustomTaskRunEventFields: jest.fn(),
      observer,
      fetchFn: withProtocol(fetchFn as typeof fetch),
    }),
  });

  it('is told the result of a run the process served', async () => {
    const { runner, observer } = create(answer({ kind: 'result', result: { state: { a: 1 } } }));
    await runner.run();
    expect(observer.onResult).toHaveBeenCalledWith({ state: { a: 1 } });
    expect(observer.onCancel).not.toHaveBeenCalled();
  });

  it('is told the task run error of the result, rebuilt as Task Manager sees it', async () => {
    const { runner, observer } = create(
      answer({
        kind: 'result',
        result: { state: {}, taskRunError: { message: 'boom', source: 'user' } },
      })
    );
    await runner.run();
    expect(observer.onResult).toHaveBeenCalledWith(
      expect.objectContaining({ taskRunError: expect.any(Error) })
    );
  });

  it('is not told about execution or capability failures', async () => {
    const thrown = create(
      answer({ kind: 'thrown', error: { message: 'bad', stack: 'x', source: 'framework' } })
    );
    await expect(thrown.runner.run()).rejects.toBeDefined();
    expect(thrown.observer.onResult).not.toHaveBeenCalled();

    const declined = create(
      jest.fn().mockResolvedValue({ ok: false, status: 422, json: async () => ({ reason: 'r' }) })
    );
    await expect(declined.runner.run()).rejects.toThrow('r');
    expect(declined.observer.onResult).not.toHaveBeenCalled();
  });

  it('is told once when Kibana cancels a run the process has, and not of its result', async () => {
    let finish: (value: unknown) => void = () => undefined;
    const fetchFn = jest.fn((url: string) =>
      url.endsWith('/run')
        ? new Promise((resolve) => (finish = resolve))
        : Promise.resolve({ ok: true })
    );
    const { runner, observer } = create(fetchFn);
    const run = runner.run();
    await new Promise((resolve) => setImmediate(resolve));

    await runner.cancel();
    await runner.cancel();
    finish({
      ok: true,
      status: 200,
      json: async () => ({ kind: 'result', result: { state: {} } }),
    });
    await run;

    expect(observer.onCancel).toHaveBeenCalledTimes(1);
    expect(observer.onResult).not.toHaveBeenCalled();
  });

  it('is not told of a cancel before the process was reached', async () => {
    const { runner, observer } = create(jest.fn());
    await runner.cancel();
    expect(observer.onCancel).not.toHaveBeenCalled();
  });

  it('never fails the run when the observer throws', async () => {
    const { runner } = create(answer({ kind: 'result', result: { state: {} } }), {
      onResult: jest.fn(() => {
        throw new Error('observer');
      }),
      onCancel: jest.fn(),
    });
    await expect(runner.run()).resolves.toEqual({ state: {} });
  });
});
