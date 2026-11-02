/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { isExternalUiamCredential } from '@kbn/core-security-server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { TaskErrorSource } from '../../common';
import {
  createRetryableError,
  createTaskRunError,
  deserializeTaskRunError,
  getErrorSource,
  isRetryableError,
  isUnrecoverableError,
  serializeTaskRunError,
  throwUnrecoverableError,
} from '../task_running/errors';
import {
  deserializeRunResult,
  encodePodArgs,
  reviveTaskInstance,
  serializeRunResult,
  setPodRequestExtrasReader,
} from './wire';
import { PodContractRegistry } from './pod_contract_registry';
import { PodContractNotFoundError } from './pod_contract_not_found_error';
import { createPodDispatch } from './pod_dispatch';
import { RemoteTaskRunner } from './remote_task_runner';

const roundTrip = (error: Error) =>
  deserializeTaskRunError(JSON.parse(JSON.stringify(serializeTaskRunError(error))));

describe('task pod wire format', () => {
  describe('errors', () => {
    test('unrecoverable survives JSON', () => {
      const error = new Error('gone');
      try {
        throwUnrecoverableError(error);
      } catch (e) {
        // marked
      }
      const result = roundTrip(error);
      expect(result.message).toBe('gone');
      expect(isUnrecoverableError(result)).toBe(true);
    });

    test('retryable keeps a retry date', () => {
      const at = new Date('2030-01-01T00:00:00.000Z');
      const result = roundTrip(createRetryableError(new Error('later'), at));
      expect(isRetryableError(result)).toEqual(at);
    });

    test('retryable keeps a boolean', () => {
      expect(isRetryableError(roundTrip(createRetryableError(new Error('x'), false)))).toBe(false);
    });

    test('user error source survives', () => {
      const result = roundTrip(createTaskRunError(new Error('bad'), TaskErrorSource.USER));
      expect(getErrorSource(result)).toBe(TaskErrorSource.USER);
    });

    test('plain errors stay undecorated', () => {
      const result = roundTrip(new Error('plain'));
      expect(isUnrecoverableError(result)).toBe(false);
      expect(isRetryableError(result)).toBeNull();
      expect(getErrorSource(result)).toBeUndefined();
    });
  });

  describe('run results', () => {
    test('round-trips runAt, state and errors', () => {
      const runAt = new Date('2030-01-01T00:00:00.000Z');
      const result = deserializeRunResult(
        JSON.parse(
          JSON.stringify(
            serializeRunResult({
              state: { a: 1 },
              runAt,
              shouldDeleteTask: false,
              taskRunError: createTaskRunError(new Error('soft'), TaskErrorSource.USER),
            })
          )
        )
      ) as unknown as Record<string, unknown>;
      expect(result.state).toEqual({ a: 1 });
      expect(result.runAt).toEqual(runAt);
      expect(getErrorSource(result.taskRunError as Error)).toBe(TaskErrorSource.USER);
    });

    test('undefined stays undefined', () => {
      expect(deserializeRunResult(serializeRunResult(undefined))).toBeUndefined();
    });

    test('revives task instance dates', () => {
      const instance = reviveTaskInstance({
        id: '1',
        scheduledAt: '2030-01-01T00:00:00.000Z',
        retryAt: null,
      });
      expect(instance.scheduledAt).toEqual(new Date('2030-01-01T00:00:00.000Z'));
      expect(instance.retryAt).toBeNull();
    });
  });

  describe('PodContractRegistry', () => {
    const logger = loggingSystemMock.createLogger();

    test('invokes registered handlers for a live run with its context', async () => {
      const registry = new PodContractRegistry(logger);
      registry.register('p', { echo: async (ctx, a) => ({ a, id: ctx.executionUuid }) });
      const token = registry.startRun({
        executionUuid: 'e1',
        taskType: 't',
        getFakeRequest: () => undefined,
      });
      await expect(registry.invoke(token, 'p', 'echo', [1])).resolves.toEqual({ a: 1, id: 'e1' });
    });

    test('rejects unknown methods and ended runs, and runs cleanups at end', async () => {
      const registry = new PodContractRegistry(logger);
      const cleanup = jest.fn();
      registry.register('p', { m: async (ctx) => ctx.onRunEnd(cleanup) });
      const token = registry.startRun({
        executionUuid: 'e1',
        taskType: 't',
        getFakeRequest: () => undefined,
      });
      await expect(registry.invoke(token, 'p', 'nope', [])).rejects.toBeInstanceOf(
        PodContractNotFoundError
      );
      await registry.invoke(token, 'p', 'm', []);
      await registry.endRun(token);
      expect(cleanup).toHaveBeenCalledTimes(1);
      await expect(registry.invoke(token, 'p', 'm', [])).rejects.toBeInstanceOf(
        PodContractNotFoundError
      );
    });

    test("rebuilds each request from its own identity, not the run's", async () => {
      const registry = new PodContractRegistry(logger);
      registry.register('p', { who: async (_ctx, request) => (request as any).headers });
      const token = registry.startRun({
        executionUuid: 'e1',
        taskType: 't',
        getFakeRequest: () => undefined,
      });
      const encoded = JSON.parse(
        encodePodArgs([
          { isSystemRequest: false, route: {}, headers: { authorization: 'ApiKey policy-key' } },
        ])
      );
      await expect(registry.invoke(token, 'p', 'who', encoded)).resolves.toEqual({
        authorization: 'ApiKey policy-key',
      });
    });

    test("a pod's request keeps its user and UIAM verdict when Kibana rebuilds it", async () => {
      const enrichFakeRequest = jest.fn();
      const registry = new PodContractRegistry(logger, () => enrichFakeRequest);
      registry.register('p', {
        who: async (_ctx, request) => ({
          external: isExternalUiamCredential(request as never),
          space: (request as any).headers.authorization,
        }),
      });
      const token = registry.startRun({
        executionUuid: 'e1',
        taskType: 't',
        getFakeRequest: () => undefined,
      });
      setPodRequestExtrasReader(() => ({
        userProfileId: 'u_1',
        userName: 'elastic',
        uiamApiKeyExternal: true,
      }));
      try {
        const encoded = JSON.parse(
          encodePodArgs([
            { isSystemRequest: false, route: {}, headers: { authorization: 'ApiKey k' } },
          ])
        );
        await expect(registry.invoke(token, 'p', 'who', encoded)).resolves.toEqual({
          external: true,
          space: 'ApiKey k',
        });
        expect(enrichFakeRequest).toHaveBeenCalledWith(expect.anything(), {
          profileId: 'u_1',
          username: 'elastic',
        });
      } finally {
        setPodRequestExtrasReader(() => undefined);
      }
    });

    test('rejects duplicate plugin registration', () => {
      const registry = new PodContractRegistry(logger);
      registry.register('p', {});
      expect(() => registry.register('p', {})).toThrow();
    });
  });

  describe('createPodDispatch', () => {
    test('routes by glob, defaults to local', () => {
      const dispatch = createPodDispatch({
        pods: [{ url: 'http://pod:1/', task_types: ['alerting_v2:*'] }],
        callbackUrl: 'http://kb',
        registry: new PodContractRegistry(loggingSystemMock.createLogger()),
        kibanaVersion: '9.6.0',
      });
      expect(dispatch.getPod('alerting_v2:dispatcher')).toEqual({
        url: 'http://pod:1',
        callbackUrl: 'http://kb',
      });
      expect(dispatch.getPod('other:task')).toBeUndefined();
    });
  });

  describe('RemoteTaskRunner', () => {
    const build = (fetchFn: jest.Mock<any, any[]>, timeoutMs = 60000) => {
      const startRun = jest.fn(() => 'tok');
      const endRun = jest.fn(async () => {});
      const setFields = jest.fn();
      const runner = new RemoteTaskRunner({
        pod: { url: 'http://pod', callbackUrl: 'http://kb' },
        request: { taskType: 't', taskInstance: {}, executionUuid: 'e1' },
        timeoutMs,
        startRun,
        endRun,
        setCustomTaskRunEventFields: setFields,
        fetchFn,
      });
      return { runner, startRun, endRun, setFields };
    };
    const respond = (body: unknown) =>
      jest.fn<any, any[]>(async () => ({ ok: true, status: 200, json: async () => body }));

    test('returns the rebuilt result, sends the callback token, and ends the run', async () => {
      const fetchFn = respond({
        kind: 'result',
        result: { state: { n: 2 } },
        customTaskRunEventFields: { x: 1 },
      });
      const { runner, endRun, setFields } = build(fetchFn);
      await expect(runner.run()).resolves.toEqual({ state: { n: 2 } });
      expect(JSON.parse(fetchFn.mock.calls[0][1].body).callback).toEqual({
        url: 'http://kb',
        token: 'tok',
      });
      expect(setFields).toHaveBeenCalledWith({ x: 1 });
      expect(endRun).toHaveBeenCalledWith('tok');
    });

    test('rethrows a rebuilt error and still ends the run', async () => {
      const fetchFn = respond({
        kind: 'thrown',
        error: serializeTaskRunError(createRetryableError(new Error('boom'), true)),
      });
      const { runner, endRun } = build(fetchFn);
      const error = await runner.run().catch((e) => e);
      expect(error.message).toBe('boom');
      expect(isRetryableError(error)).toBe(true);
      expect(endRun).toHaveBeenCalled();
    });

    test('non-2xx from the pod is an error', async () => {
      const { runner } = build(jest.fn<any, any[]>(async () => ({ ok: false, status: 502 })));
      await expect(runner.run()).rejects.toThrow('502');
    });

    test('cancel posts to the pod and swallows failures', async () => {
      const fetchFn = jest.fn<any, any[]>(async () => {
        throw new Error('down');
      });
      const { runner } = build(fetchFn);
      await expect(runner.cancel()).resolves.toBeUndefined();
      expect(fetchFn).toHaveBeenCalledWith(
        'http://pod/cancel/e1',
        expect.objectContaining({ method: 'POST' })
      );
    });

    test('sends the deadline and the Kibana version the run was dispatched with', async () => {
      const fetchFn = respond({ kind: 'result' });
      const { runner } = build(fetchFn, 30000);
      const before = Date.now();
      await runner.run();
      const sent = JSON.parse(fetchFn.mock.calls[0][1].body);
      expect(new Date(sent.deadline).getTime() - before).toBeGreaterThanOrEqual(29000);
      expect(new Date(sent.deadline).getTime() - before).toBeLessThanOrEqual(31000);
    });

    test.each([503, 404, 409])('a %i from the pod is retried soon, not failed', async (status) => {
      const cancelBody = jest.fn(async () => undefined);
      const { runner, endRun } = build(
        jest.fn<any, any[]>(async () => ({ ok: false, status, body: { cancel: cancelBody } }))
      );
      const error = await runner.run().catch((e) => e);
      expect(isRetryableError(error)).toBeTruthy();
      expect(cancelBody).toHaveBeenCalled();
      expect(endRun).toHaveBeenCalledWith('tok');
    });

    test('an unreachable pod is retried soon', async () => {
      const { runner } = build(
        jest.fn<any, any[]>(async () => {
          throw new Error('ECONNREFUSED');
        })
      );
      const error = await runner.run().catch((e) => e);
      expect(error.message).toContain('unreachable');
      expect(isRetryableError(error)).toBeTruthy();
    });

    test('stops waiting at the task timeout (plus grace) and ends the run', async () => {
      jest.useFakeTimers();
      try {
        const fetchFn = jest.fn<any, any[]>(
          (_url: string, init: { signal: AbortSignal }) =>
            new Promise((_resolve, reject) =>
              init.signal.addEventListener('abort', () => reject(new Error('aborted')))
            )
        );
        const { runner, endRun } = build(fetchFn, 1000);
        const result = runner.run().catch((e) => e);
        await jest.advanceTimersByTimeAsync(1000 + 5000);
        expect((await result).message).toBe('aborted');
        expect(endRun).toHaveBeenCalledWith('tok');
      } finally {
        jest.useRealTimers();
      }
    });

    test('cancel also ends the run so its token and finders are released', async () => {
      const { runner, endRun } = build(
        jest.fn<any, any[]>((url: string, init: { signal: AbortSignal }) =>
          url.endsWith('/run')
            ? new Promise(() => undefined)
            : Promise.resolve({ ok: true, status: 200 })
        )
      );
      void runner.run();
      await runner.cancel();
      expect(endRun).toHaveBeenCalledWith('tok');
    });
  });
});
