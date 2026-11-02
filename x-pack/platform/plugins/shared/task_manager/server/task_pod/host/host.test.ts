/**
 * @jest-environment node
 */

/* eslint-disable @kbn/eslint/require-license-header */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createServer } from 'http';
import { fetch as undiciFetch } from 'undici';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { invokePodContract } from '../../routes/pod_contract';
import { PodContractRegistry } from '../pod_contract_registry';
import { RemoteTaskRunner } from '../remote_task_runner';
import {
  isRetryableError,
  isUnrecoverableError,
  throwUnrecoverableError,
} from '../../task_running/errors';
import { definePodPlugin } from './define_pod_plugin';
import { callKibana } from './remote';
import { bootPod, sortPlugins } from './plugin_system';
import { startPodServer } from './server';

const listen = (server: Server) =>
  new Promise<number>((resolve) =>
    server.listen(0, () => resolve((server.address() as AddressInfo).port))
  );

const readJson = (req: import('http').IncomingMessage) =>
  new Promise<any>((resolve) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => resolve(JSON.parse(body)));
  });

describe('task pod host', () => {
  const logger = loggingSystemMock.createLogger();
  const originalEnv = process.env.ES_URL;
  let pod: Server;
  let kibana: Server;
  let podUrl: string;
  let kibanaUrl: string;
  let registry: PodContractRegistry;
  const echoed: unknown[] = [];
  let definitions: Awaited<ReturnType<typeof bootPod>>['taskDefinitions'];

  const originalFetch = global.fetch;

  beforeAll(async () => {
    // Jest's setup polyfills `fetch` with an XHR-based one; these are real network calls.
    global.fetch = undiciFetch as never;
    process.env.ES_URL = 'http://localhost:9';
    registry = new PodContractRegistry(logger);
    registry.register('test', {
      whoAmI: async (_ctx, request, value) => {
        echoed.push(value);
        return { authorization: (request as any)?.headers?.authorization, value };
      },
    });

    // Kibana's side of the callback channel: the route's own handling, minus the HTTP framework.
    kibana = createServer(async (req, res) => {
      const { status, body } = await invokePodContract(registry, logger, await readJson(req));
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    });
    kibanaUrl = `http://localhost:${await listen(kibana)}`;

    ({ taskDefinitions: definitions } = await bootPod({
      plugins: [
        definePodPlugin({
          id: 'testPlugin',
          requiredPlugins: ['taskManager'],
          setup: (_core, { taskManager }) => {
            taskManager.registerTaskDefinitions({
              'test:call': {
                createTaskRunner: ({ fakeRequest }: any) => ({
                  run: async () => ({
                    state: await callKibana('test', 'whoAmI', [fakeRequest, 7]),
                  }),
                }),
              },
              'test:own_identity': {
                // A task may call a contract with a request built from credentials other than its own.
                createTaskRunner: ({ fakeRequest }: any) => ({
                  run: async () => {
                    const other = { ...fakeRequest, headers: { authorization: 'ApiKey other' } };
                    return { state: await callKibana('test', 'whoAmI', [other, 8]) };
                  },
                }),
              },
              'test:fails': {
                createTaskRunner: () => ({
                  run: async () => {
                    throwUnrecoverableError(new Error('rule is gone'));
                  },
                }),
              },
              'test:chained_late_call': {
                createTaskRunner: () => ({
                  run: async () => {
                    // A subscriber whose follow-up call starts only after the first response.
                    setImmediate(async () => {
                      await callKibana('test', 'whoAmI', [undefined, 'first']);
                      await new Promise((resolve) => setImmediate(resolve));
                      await callKibana('test', 'whoAmI', [undefined, 'second']).catch(
                        () => undefined
                      );
                    });
                    return { state: {} };
                  },
                }),
              },
              'test:unicode': {
                createTaskRunner: ({ taskInstance }: any) => ({
                  run: async () => ({ state: { echoed: taskInstance.params.text } }),
                }),
              },
              'test:waits_for_abort': {
                createTaskRunner: ({ signal }: any) => ({
                  run: async () => {
                    await new Promise((resolve) => signal.addEventListener('abort', resolve));
                    return { state: { aborted: true } };
                  },
                }),
              },
              'test:hold': {
                createTaskRunner: () => ({
                  run: () =>
                    new Promise((resolve) => setTimeout(() => resolve({ state: {} }), 300)),
                }),
              },
              'test:late_call': {
                createTaskRunner: () => ({
                  run: async () => {
                    // Like an event subscriber: calls Kibana after run() has returned.
                    setImmediate(() => {
                      callKibana('test', 'whoAmI', [undefined, 'late']).catch(() => undefined);
                    });
                    return { state: {} };
                  },
                }),
              },
            });
          },
        }),
      ],
    }));
    pod = startPodServer({ taskDefinitions: definitions, port: 0 });
    podUrl = `http://localhost:${await new Promise<number>((resolve) =>
      pod.on('listening', () => resolve((pod.address() as AddressInfo).port))
    )}`;
  });

  afterAll(async () => {
    pod.close();
    kibana.close();
    process.env.ES_URL = originalEnv;
    global.fetch = originalFetch;
  });

  const run = (
    taskType: string,
    { timeoutMs = 60000, podUrl: url = podUrl, ...requestOverrides }: Record<string, any> = {}
  ) => {
    const taskId = 'task-1';
    const startRun = jest.fn(() =>
      registry.startRun({
        executionUuid: `exec-${taskType}`,
        taskType,
        getFakeRequest: () => undefined,
      })
    );
    const endRun = jest.fn((token: string) => registry.endRun(token));
    const runner = new RemoteTaskRunner({
      pod: { url, callbackUrl: kibanaUrl },
      request: {
        taskType,
        taskInstance: { id: taskId, taskType, params: {}, state: {}, attempts: 0 },
        executionUuid: `exec-${taskType}`,
        apiKey: 'run-key',
        spaceId: 'default',
        ...requestOverrides,
      },
      timeoutMs,
      startRun,
      endRun,
      setCustomTaskRunEventFields: jest.fn(),
    });
    return { runner, endRun };
  };

  test('a task calls back into Kibana with the identity of the run, and the run ends cleanly', async () => {
    const { runner, endRun } = run('test:call');
    await expect(runner.run()).resolves.toEqual({
      state: { authorization: 'ApiKey run-key', value: 7 },
    });
    expect(endRun).toHaveBeenCalledTimes(1);
  });

  test('a request built from other credentials keeps its own identity', async () => {
    const { runner } = run('test:own_identity');
    await expect(runner.run()).resolves.toEqual({
      state: { authorization: 'ApiKey other', value: 8 },
    });
  });

  test('an unrecoverable error comes back unrecoverable', async () => {
    const { runner } = run('test:fails');
    const error = await runner.run().catch((e) => e);
    expect(error.message).toBe('rule is gone');
    expect(isUnrecoverableError(error)).toBe(true);
  });

  test('calls made after run() returns finish before the run is ended', async () => {
    echoed.length = 0;
    const { runner } = run('test:late_call');
    await runner.run();
    expect(echoed).toContain('late');
  });

  test('an unregistered task type is a 404, not a hang', async () => {
    const { runner } = run('test:missing');
    await expect(runner.run()).rejects.toThrow('404');
  });

  test('a follow-up call that starts after an earlier response still finds a live token', async () => {
    echoed.length = 0;
    const { runner } = run('test:chained_late_call');
    await runner.run();
    expect(echoed).toEqual(expect.arrayContaining(['first', 'second']));
  });

  test('non-ASCII content survives the request body', async () => {
    const text = 'héllo — 日本語 😀'.repeat(2000);
    const { runner } = run('test:unicode', { taskInstance: { id: 't', params: { text } } });
    await expect(runner.run()).resolves.toEqual({ state: { echoed: text } });
  });

  test('the pod aborts a run at its deadline instead of running on', async () => {
    const { runner } = run('test:waits_for_abort', { timeoutMs: 200 });
    await expect(runner.run()).resolves.toEqual({ state: { aborted: true } });
  });

  test('a run from a Kibana of another version is refused, and retried soon', async () => {
    const { runner } = run('test:call', { kibanaVersion: '1.2.3' });
    const error = await runner.run().catch((e) => e);
    expect(error.message).toContain('409');
    expect(isRetryableError(error)).toBeTruthy();
  });

  describe('serving a subset of task types at limited concurrency', () => {
    let limited: Server;
    let limitedUrl: string;

    beforeAll(async () => {
      limited = startPodServer({
        taskDefinitions: definitions,
        port: 0,
        taskTypes: ['test:hold', 'test:fails'],
        maxConcurrency: 1,
      });
      limitedUrl = `http://localhost:${await new Promise<number>((resolve) =>
        limited.on('listening', () => resolve((limited.address() as AddressInfo).port))
      )}`;
    });

    afterAll(() => limited.close());

    test('does not serve task types outside its list', async () => {
      const { runner } = run('test:call', { podUrl: limitedUrl });
      await expect(runner.run()).rejects.toThrow('404');
    });

    test('answers 503 over capacity so Kibana retries instead of queueing', async () => {
      const first = run('test:hold', { podUrl: limitedUrl }).runner.run();
      await new Promise((resolve) => setTimeout(resolve, 50));
      const { runner } = run('test:fails', { podUrl: limitedUrl });
      const error = await runner.run().catch((e) => e);
      expect(error.message).toContain('503');
      expect(isRetryableError(error)).toBeTruthy();
      await first;
    });
  });

  describe('plugin system', () => {
    test('fails at boot naming a missing required plugin', () => {
      expect(() =>
        sortPlugins([definePodPlugin({ id: 'a', requiredPlugins: ['missing'] })])
      ).toThrow(/'a' requires 'missing'/);
    });

    test('orders dependencies first and ignores absent optional ones', () => {
      const order = sortPlugins([
        definePodPlugin({ id: 'a', requiredPlugins: ['b'], optionalPlugins: ['nope'] }),
        definePodPlugin({ id: 'b' }),
      ]).map((p) => p.id);
      expect(order).toEqual(['b', 'a']);
    });

    test('rejects a dependency cycle', () => {
      expect(() =>
        sortPlugins([
          definePodPlugin({ id: 'a', requiredPlugins: ['b'] }),
          definePodPlugin({ id: 'b', requiredPlugins: ['a'] }),
        ])
      ).toThrow(/cycle/);
    });
  });
});
