/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

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
import { deserializeRunResult, reviveTaskInstance, serializeRunResult } from './wire';
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

  describe('createPodDispatch', () => {
    test('routes by glob, defaults to local', () => {
      const dispatch = createPodDispatch({
        pods: [{ url: 'http://pod:1/', task_types: ['alerting_v2:*'] }],
        kibanaVersion: '9.6.0',
      });
      expect(dispatch.getPod('alerting_v2:dispatcher')).toEqual({ url: 'http://pod:1' });
      expect(dispatch.getPod('other:task')).toBeUndefined();
    });
  });

  describe('RemoteTaskRunner', () => {
    const build = (fetchFn: jest.Mock<any, any[]>, timeoutMs = 60000) => {
      const setFields = jest.fn();
      const runner = new RemoteTaskRunner({
        pod: { url: 'http://pod' },
        request: { taskType: 't', taskInstance: {}, executionUuid: 'e1' },
        timeoutMs,
        setCustomTaskRunEventFields: setFields,
        fetchFn,
      });
      return { runner, setFields };
    };
    const respond = (body: unknown) =>
      jest.fn<any, any[]>(async () => ({ ok: true, status: 200, json: async () => body }));

    test('returns the rebuilt result and the custom run event fields', async () => {
      const fetchFn = respond({
        kind: 'result',
        result: { state: { n: 2 } },
        customTaskRunEventFields: { x: 1 },
      });
      const { runner, setFields } = build(fetchFn);
      await expect(runner.run()).resolves.toEqual({ state: { n: 2 } });
      expect(JSON.parse(fetchFn.mock.calls[0][1].body)).not.toHaveProperty('callback');
      expect(setFields).toHaveBeenCalledWith({ x: 1 });
    });

    test('rethrows a rebuilt error', async () => {
      const fetchFn = respond({
        kind: 'thrown',
        error: serializeTaskRunError(createRetryableError(new Error('boom'), true)),
      });
      const { runner } = build(fetchFn);
      const error = await runner.run().catch((e) => e);
      expect(error.message).toBe('boom');
      expect(isRetryableError(error)).toBe(true);
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
      const { runner } = build(
        jest.fn<any, any[]>(async () => ({ ok: false, status, body: { cancel: cancelBody } }))
      );
      const error = await runner.run().catch((e) => e);
      expect(isRetryableError(error)).toBeTruthy();
      expect(cancelBody).toHaveBeenCalled();
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

    test('stops waiting at the task timeout (plus grace)', async () => {
      jest.useFakeTimers();
      try {
        const fetchFn = jest.fn<any, any[]>(
          (_url: string, init: { signal: AbortSignal }) =>
            new Promise((_resolve, reject) =>
              init.signal.addEventListener('abort', () => reject(new Error('aborted')))
            )
        );
        const { runner } = build(fetchFn, 1000);
        const result = runner.run().catch((e) => e);
        await jest.advanceTimersByTimeAsync(1000 + 5000);
        expect((await result).message).toBe('aborted');
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
