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

import { fetch as undiciFetch } from 'undici';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { RemoteTaskRunner } from '../remote_task_runner';
import {
  isRetryableError,
  isUnrecoverableError,
  throwUnrecoverableError,
} from '../../task_running/errors';
import { definePodPlugin } from './define_pod_plugin';
import {
  createHttpStart,
  createSecurityStart,
  createUserProfileStart,
  enrichPodFakeRequest,
} from './core/small_services';
import { bootPod, sortPlugins } from './plugin_system';
import { startPodServer } from './server';

describe('task pod host', () => {
  const originalEnv = process.env.ES_URL;
  let pod: Server;
  let podUrl: string;
  let definitions: Awaited<ReturnType<typeof bootPod>>['taskDefinitions'];

  const originalFetch = global.fetch;

  beforeAll(async () => {
    // Jest's setup polyfills `fetch` with an XHR-based one; these are real network calls.
    global.fetch = undiciFetch as never;
    process.env.ES_URL = 'http://localhost:9';

    ({ taskDefinitions: definitions } = await bootPod({
      plugins: [
        definePodPlugin({
          id: 'testPlugin',
          requiredPlugins: ['taskManager'],
          setup: (_core, { taskManager }) => {
            taskManager.registerTaskDefinitions({
              'test:identity': {
                // The pod rebuilds the run's fake request from the credentials Kibana sent.
                createTaskRunner: ({ fakeRequest }: any) => ({
                  run: async () => ({
                    state: {
                      authorization: fakeRequest?.headers?.authorization,
                      space: fakeRequest?.spaceId,
                    },
                  }),
                }),
              },
              'test:fails': {
                createTaskRunner: () => ({
                  run: async () => {
                    throwUnrecoverableError(new Error('rule is gone'));
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
    process.env.ES_URL = originalEnv;
    global.fetch = originalFetch;
  });

  const run = (
    taskType: string,
    { timeoutMs = 60000, podUrl: url = podUrl, ...requestOverrides }: Record<string, any> = {}
  ) => {
    const taskId = 'task-1';
    const runner = new RemoteTaskRunner({
      pod: { url },
      request: {
        taskType,
        taskInstance: { id: taskId, taskType, params: {}, state: {}, attempts: 0 },
        executionUuid: `exec-${taskType}`,
        apiKey: 'run-key',
        spaceId: 'default',
        ...requestOverrides,
      },
      timeoutMs,
      setCustomTaskRunEventFields: jest.fn(),
    });
    return { runner };
  };

  test('a task runs with a fake request built from the identity of the run', async () => {
    const { runner } = run('test:identity');
    await expect(runner.run()).resolves.toEqual({
      state: { authorization: 'ApiKey run-key', space: 'default' },
    });
  });

  test('an unrecoverable error comes back unrecoverable', async () => {
    const { runner } = run('test:fails');
    const error = await runner.run().catch((e) => e);
    expect(error.message).toBe('rule is gone');
    expect(isUnrecoverableError(error)).toBe(true);
  });

  test('an unregistered task type is a 404, not a hang', async () => {
    const { runner } = run('test:missing');
    await expect(runner.run()).rejects.toThrow('404');
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
    const { runner } = run('test:identity', { kibanaVersion: '1.2.3' });
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
      const { runner } = run('test:identity', { podUrl: limitedUrl });
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

  describe('API keys in a pod', () => {
    const request = (authorization?: string) => ({ headers: { authorization } } as never);

    test('clones the request key through Elasticsearch, metadata before expiration', async () => {
      const transport = { request: jest.fn().mockResolvedValue({ id: 'k2', api_key: 'secret' }) };
      const { authc } = createSecurityStart({ transport } as never);

      await authc.apiKeys.cloneAsInternalUser(request('ApiKey abc123'), {
        name: 'TaskManager: workflow:run',
        metadata: { managed: true },
      });

      const call = transport.request.mock.calls[0][0];
      expect(call).toMatchObject({ method: 'POST', path: '/_security/api_key/clone' });
      expect(Object.keys(call.body)).toEqual(['api_key', 'name', 'metadata', 'expiration']);
      expect(call.body).toMatchObject({ api_key: 'abc123', expiration: null });
    });

    test.each([undefined, 'Bearer token'])('refuses to clone from %s', async (header) => {
      const { authc } = createSecurityStart({ transport: { request: jest.fn() } } as never);
      await expect(
        authc.apiKeys.cloneAsInternalUser(request(header), { name: 'n' })
      ).rejects.toThrow(/Unable to clone an API key/);
    });

    test('API keys are enabled unless Elasticsearch says they are not', async () => {
      const security = { invalidateApiKey: jest.fn().mockResolvedValue({}) };
      expect(
        await createSecurityStart({ security } as never).authc.apiKeys.areAPIKeysEnabled()
      ).toBe(true);

      security.invalidateApiKey.mockRejectedValue(new Error('api keys are not enabled'));
      expect(
        await createSecurityStart({ security } as never).authc.apiKeys.areAPIKeysEnabled()
      ).toBe(false);

      security.invalidateApiKey.mockRejectedValue(new Error('connection refused'));
      await expect(
        createSecurityStart({ security } as never).authc.apiKeys.areAPIKeysEnabled()
      ).rejects.toThrow('connection refused');
    });
  });

  describe('user profile in a pod', () => {
    const keyHeader = `ApiKey ${Buffer.from('key-1:secret').toString('base64')}`;

    test('asks Elasticsearch for the profile linked to a bare API key request, as that key', async () => {
      const getApiKey = jest.fn().mockResolvedValue({ api_keys: [{ profile_uid: 'u_profile' }] });
      const child = jest.fn().mockReturnValue({ security: { getApiKey } });
      const { getCurrentProfileId } = createUserProfileStart({ child } as never);

      await expect(
        getCurrentProfileId({ request: { headers: { authorization: keyHeader } } as never })
      ).resolves.toBe('u_profile');
      expect(child).toHaveBeenCalledWith({ headers: { authorization: keyHeader } });
      expect(getApiKey).toHaveBeenCalledWith({ id: 'key-1', with_profile_uid: true });
    });

    test('uses the profile a request was enriched with, without asking', async () => {
      const child = jest.fn();
      const request = { headers: { authorization: keyHeader } } as never;
      enrichPodFakeRequest(request, { profileId: 'u_enriched', username: 'elastic' });

      await expect(
        createUserProfileStart({ child } as never).getCurrentProfileId({ request })
      ).resolves.toBe('u_enriched');
      expect(child).not.toHaveBeenCalled();
    });

    test('has no profile for other credentials, or when the lookup fails', async () => {
      const failing = {
        child: () => ({ security: { getApiKey: jest.fn().mockRejectedValue(new Error('no')) } }),
      };
      const { getCurrentProfileId } = createUserProfileStart(failing as never);

      await expect(
        getCurrentProfileId({ request: { headers: { authorization: 'Bearer x' } } as never })
      ).resolves.toBeNull();
      await expect(
        getCurrentProfileId({ request: { headers: { authorization: keyHeader } } as never })
      ).resolves.toBeNull();
    });
  });

  describe('Task Manager in a pod', () => {
    test('has no scheduling unless the pod schedules tasks itself, and says so', async () => {
      const taskManagerSeen: unknown[] = [];
      await bootPod({
        plugins: [
          definePodPlugin({
            id: 'consumer',
            requiredPlugins: ['taskManager'],
            start: (_core, { taskManager }) => taskManagerSeen.push(taskManager),
          }),
        ],
      });
      expect(() => (taskManagerSeen[0] as { schedule: () => void }).schedule()).toThrow(
        /taskManager\.schedule is not available in a task pod/
      );
    });

    test('uses the pod plugin that schedules tasks locally when there is one', async () => {
      const local = { schedule: jest.fn().mockResolvedValue({ id: 'local' }) };
      const seen: unknown[] = [];
      await bootPod({
        plugins: [
          definePodPlugin({ id: 'taskScheduling', start: () => local }),
          definePodPlugin({
            id: 'consumer',
            requiredPlugins: ['taskManager'],
            start: (_core, { taskManager }) => seen.push(taskManager),
          }),
        ],
      });
      expect(seen[0]).toBe(local);
    });
  });

  describe('Core http in a pod', () => {
    test('exposes the public base URL and base path from the kibana.yml server keys', () => {
      const http = createHttpStart({
        server: { publicBaseUrl: 'https://kibana.example', basePath: '/kbn' },
      });
      expect(http.basePath.publicBaseUrl).toBe('https://kibana.example');
      expect(http.basePath.prepend('/app')).toBe('/kbn/app');
    });

    test('falls back to Kibana-like server defaults', () => {
      const http = createHttpStart({});
      expect(http.basePath.publicBaseUrl).toBeUndefined();
      expect(http.getServerInfo()).toMatchObject({ hostname: 'localhost', port: 5601 });
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
