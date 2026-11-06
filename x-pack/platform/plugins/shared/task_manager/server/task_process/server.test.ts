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

import type { Server } from 'http';
import { fetch as undiciFetch } from 'undici';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { createRetryableError } from '../task_running/errors';
import type { CancellableTask } from '../task';
import { startTaskProcessServer } from './server';
import { RemoteTaskRunner } from './remote_task_runner';

const TYPE = 'test:type';
const TOKEN = 'secret';

describe('task process server', () => {
  let server: Server;
  let url: string;
  const cleanup = jest.fn();
  let createTask: () => CancellableTask;

  beforeEach(async () => {
    cleanup.mockReset();
    createTask = () => ({ run: async () => ({ state: { ran: true } }), cleanup });
    server = startTaskProcessServer({
      taskDefinitions: new Map([[TYPE, { createTaskRunner: () => createTask() }]]),
      port: 0,
      logger: loggingSystemMock.createLogger(),
      kibanaVersion: '9.9.9',
      authToken: TOKEN,
    });
    await new Promise<void>((resolve) => server.once('listening', () => resolve()));
    url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  });

  afterEach(() => {
    server.close();
  });

  const runner = (overrides: Partial<{ taskType: string; token: string; version: string }> = {}) =>
    new RemoteTaskRunner({
      route: { url, token: overrides.token ?? TOKEN },
      request: {
        taskType: overrides.taskType ?? TYPE,
        taskInstance: { id: 't1', taskType: TYPE, params: {}, state: {} },
        executionUuid: 'run-1',
        kibanaVersion: overrides.version ?? '9.9.9',
      },
      timeoutMs: 5000,
      setCustomTaskRunEventFields: jest.fn(),
      fetchFn: undiciFetch as unknown as typeof fetch,
    });

  it('reports the task types it serves', async () => {
    const response = await undiciFetch(`${url}/health`);
    expect(((await response.json()) as { taskTypes: string[] }).taskTypes).toEqual([TYPE]);
  });

  it('runs a task and returns its result, then cleans it up', async () => {
    await expect(runner().run()).resolves.toEqual({ state: { ran: true } });
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('returns the error of a task that throws, keeping its retry decoration', async () => {
    const retryAt = new Date('2030-01-01T00:00:00.000Z');
    createTask = () => ({
      run: async () => {
        throw createRetryableError(new Error('boom'), retryAt);
      },
    });
    await expect(runner().run()).rejects.toThrow('boom');
  });

  it('refuses a run without the token', async () => {
    await expect(runner({ token: 'wrong' }).run()).rejects.toThrow(/401/);
  });

  it('refuses a run from another Kibana version so that Kibana retries it', async () => {
    await expect(runner({ version: '1.0.0' }).run()).rejects.toThrow(/409/);
  });

  it('answers 404 for a task type it does not serve', async () => {
    await expect(runner({ taskType: 'other:type' }).run()).rejects.toThrow(/404/);
  });
});
