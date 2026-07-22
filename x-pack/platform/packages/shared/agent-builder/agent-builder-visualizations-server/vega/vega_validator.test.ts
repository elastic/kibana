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

/** Controllable fake `Worker`; records posts and lets tests emit events. */
class MockWorker {
  public readonly posted: PostedMessage[] = [];
  public readonly terminate = jest.fn().mockResolvedValue(0);
  private readonly handlers: Record<string, Handler[]> = {};

  on(event: string, cb: Handler) {
    (this.handlers[event] ??= []).push(cb);
    return this;
  }
  postMessage(message: PostedMessage) {
    this.posted.push(message);
  }
  emit(event: string, arg?: unknown) {
    (this.handlers[event] ?? []).forEach((cb) => cb(arg));
  }
}

const mockWorkerInstances: MockWorker[] = [];

jest.mock('node:worker_threads', () => ({
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

  it('resolves with warnings when the worker reports success', async () => {
    const promise = validateVegaSpec({ spec: { mark: 'bar' }, logger });
    lastWorker().emit('message', { ok: true, warnings: ['a minor warning'] });

    await expect(promise).resolves.toEqual({ error: undefined, warnings: ['a minor warning'] });
  });

  it('resolves with the error when the worker rejects the spec', async () => {
    const promise = validateVegaSpec({ spec: { mark: 'bogus' }, logger });
    lastWorker().emit('message', { ok: false, error: 'Unrecognized mark bogus' });

    await expect(promise).resolves.toEqual({ error: 'Unrecognized mark bogus', warnings: [] });
  });

  it('terminates the worker after a completed validation', async () => {
    const promise = validateVegaSpec({ spec: { mark: 'bar' }, logger });
    lastWorker().emit('message', { ok: true, warnings: [] });
    await promise;

    expect(lastWorker().terminate).toHaveBeenCalled();
  });

  it('spawns a fresh worker per validation', async () => {
    const first = validateVegaSpec({ spec: { mark: 'bar' }, logger });
    lastWorker().emit('message', { ok: true, warnings: [] });
    await first;

    const second = validateVegaSpec({ spec: { mark: 'line' }, logger });
    lastWorker().emit('message', { ok: true, warnings: [] });
    await second;

    expect(mockWorkerInstances).toHaveLength(2);
  });

  it('caps the worker heap so a memory-bomb spec cannot exhaust the host', async () => {
    const promise = validateVegaSpec({ spec: { mark: 'bar' }, logger });
    lastWorker().emit('message', { ok: true, warnings: [] });
    await promise;

    const { Worker } = jest.requireMock('node:worker_threads');
    expect(Worker).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({ resourceLimits: { maxOldGenerationSizeMb: 128 } })
    );
  });

  it('fails open and terminates the worker when validation times out', async () => {
    jest.useFakeTimers();
    try {
      const promise = validateVegaSpec({ spec: { mark: 'bar' }, logger });
      jest.advanceTimersByTime(10_000);
      await expect(promise).resolves.toEqual({ warnings: [] });
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('timed out'));
      expect(lastWorker().terminate).toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('fails open when the worker reports an infra fault (lib load failure)', async () => {
    const promise = validateVegaSpec({ spec: { mark: 'bar' }, logger });
    lastWorker().emit('message', { ok: false, infraError: "Cannot find module 'vega'" });

    await expect(promise).resolves.toEqual({ warnings: [] });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("Cannot find module 'vega'"));
  });

  it('fails open when the worker errors', async () => {
    const promise = validateVegaSpec({ spec: { mark: 'bar' }, logger });
    lastWorker().emit('error', new Error('worker crashed'));

    await expect(promise).resolves.toEqual({ warnings: [] });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('worker crashed'));
  });

  it('fails open when the worker exits before responding', async () => {
    const promise = validateVegaSpec({ spec: { mark: 'bar' }, logger });
    lastWorker().emit('exit', 1);

    await expect(promise).resolves.toEqual({ warnings: [] });
  });
});
