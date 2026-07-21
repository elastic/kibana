/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { validateVegaSpec } from './vega_validator';

interface PostedMessage {
  spec: Record<string, unknown>;
}

type Handler = (arg: unknown) => void;

class MockWorker {
  public readonly posted: PostedMessage[] = [];
  public readonly terminate = jest.fn().mockResolvedValue(0);
  private readonly handlers: Record<string, Handler[]> = {};

  on(event: string, callback: Handler) {
    (this.handlers[event] ??= []).push(callback);
    return this;
  }

  postMessage(message: PostedMessage) {
    this.posted.push(message);
  }

  emit(event: string, arg?: unknown) {
    (this.handlers[event] ?? []).forEach((callback) => callback(arg));
  }
}

const mockWorkerInstances: MockWorker[] = [];

jest.mock('node:worker_threads', () => ({
  isMainThread: true,
  Worker: jest.fn().mockImplementation(() => {
    const instance = new MockWorker();
    mockWorkerInstances.push(instance);
    return instance;
  }),
}));

const createLogger = (): Logger =>
  ({ debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() } as unknown as Logger);

describe('validateVegaSpec', () => {
  let logger: Logger;

  beforeEach(() => {
    mockWorkerInstances.length = 0;
    logger = createLogger();
  });

  const lastWorker = () => mockWorkerInstances[mockWorkerInstances.length - 1];

  it('returns warnings reported by a successful validation', async () => {
    const promise = validateVegaSpec({ spec: { mark: 'bar' }, logger });
    lastWorker().emit('message', { ok: true, warnings: ['Infinite extent for field'] });

    await expect(promise).resolves.toEqual({
      error: undefined,
      warnings: ['Infinite extent for field'],
    });
  });

  it('returns validation errors reported by the worker', async () => {
    const promise = validateVegaSpec({ spec: { mark: 'bogus' }, logger });
    lastWorker().emit('message', { ok: false, error: 'Unrecognized mark bogus' });

    await expect(promise).resolves.toEqual({
      error: 'Unrecognized mark bogus',
      warnings: [],
    });
  });

  it('caps worker memory and terminates it after validation', async () => {
    const promise = validateVegaSpec({ spec: { mark: 'bar' }, logger });
    lastWorker().emit('message', { ok: true, warnings: [] });
    await promise;

    const { Worker } = jest.requireMock('node:worker_threads');
    expect(Worker).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({ resourceLimits: { maxOldGenerationSizeMb: 128 } })
    );
    expect(lastWorker().terminate).toHaveBeenCalled();
  });

  it('fails open and terminates the worker when validation times out', async () => {
    jest.useFakeTimers();
    try {
      const promise = validateVegaSpec({ spec: { mark: 'bar' }, logger });
      jest.advanceTimersByTime(10_000);

      await expect(promise).resolves.toEqual({ warnings: [] });
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('timed out'));
      expect(lastWorker().terminate).toHaveBeenCalled();

      const nextPromise = validateVegaSpec({ spec: { mark: 'line' }, logger });
      expect(mockWorkerInstances).toHaveLength(2);
      lastWorker().emit('message', { ok: true, warnings: [] });
      await nextPromise;
    } finally {
      jest.useRealTimers();
    }
  });

  it('fails open when the worker reports an infrastructure failure', async () => {
    const promise = validateVegaSpec({ spec: { mark: 'bar' }, logger });
    lastWorker().emit('message', { ok: false, infraError: "Cannot find module 'vega'" });

    await expect(promise).resolves.toEqual({ warnings: [] });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("Cannot find module 'vega'"));
  });

  it('fails open and releases capacity when the worker cannot start', async () => {
    const { Worker } = jest.requireMock('node:worker_threads');
    Worker.mockImplementationOnce(() => {
      throw new Error('worker unavailable');
    });

    await expect(validateVegaSpec({ spec: { mark: 'bar' }, logger })).resolves.toEqual({
      warnings: [],
    });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('worker unavailable'));

    const nextPromise = validateVegaSpec({ spec: { mark: 'line' }, logger });
    lastWorker().emit('message', { ok: true, warnings: [] });
    await nextPromise;
  });

  it('fails open when the worker crashes', async () => {
    const promise = validateVegaSpec({ spec: { mark: 'bar' }, logger });
    lastWorker().emit('error', new Error('worker crashed'));

    await expect(promise).resolves.toEqual({ warnings: [] });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('worker crashed'));
  });

  it('fails open when the worker exits before responding', async () => {
    const promise = validateVegaSpec({ spec: { mark: 'bar' }, logger });
    lastWorker().emit('exit', 1);

    await expect(promise).resolves.toEqual({ warnings: [] });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('exited before responding'));
    expect(lastWorker().terminate).toHaveBeenCalled();
  });

  it('queues excess validations and runs them when capacity becomes available', async () => {
    const first = validateVegaSpec({ spec: { mark: 'bar' }, logger });
    const second = validateVegaSpec({ spec: { mark: 'line' }, logger });
    const queued = validateVegaSpec({
      spec: { transform: [{ calculate: 'undefined', as: 'broken' }], mark: 'point' },
      logger,
    });

    expect(mockWorkerInstances).toHaveLength(2);

    mockWorkerInstances[0].emit('message', { ok: true, warnings: [] });
    await first;

    expect(mockWorkerInstances).toHaveLength(3);
    mockWorkerInstances[2].emit('message', {
      ok: false,
      error: 'Unrecognized signal name: "undefined"',
    });
    await expect(queued).resolves.toEqual({
      error: 'Unrecognized signal name: "undefined"',
      warnings: [],
    });

    mockWorkerInstances[1].emit('message', { ok: true, warnings: [] });
    await second;
  });
});
