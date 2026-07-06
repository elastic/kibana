/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';

interface PostedMessage {
  id: number;
  spec: Record<string, unknown>;
  rows: Array<Record<string, unknown>>;
}

type Handler = (arg: unknown) => void;

/** Controllable fake `Worker`; each instance records posts and lets tests emit. */
class MockWorker {
  public readonly posted: PostedMessage[] = [];
  private readonly handlers: Record<string, Handler[]> = {};

  on(event: string, cb: Handler) {
    (this.handlers[event] ??= []).push(cb);
    return this;
  }
  postMessage(message: PostedMessage) {
    this.posted.push(message);
  }
  unref() {}
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
  let validateVegaSpec: typeof import('./vega_validator').validateVegaSpec;

  // The validator caches a singleton worker; reset the module per test so each
  // gets a fresh worker whose handlers bind that test's logger.
  beforeEach(async () => {
    jest.resetModules();
    mockWorkerInstances.length = 0;
    logger = createLogger();
    ({ validateVegaSpec } = await import('./vega_validator'));
  });

  const onlyWorker = () => mockWorkerInstances[0];

  it('resolves with warnings when the worker reports success', async () => {
    const promise = validateVegaSpec({ spec: { mark: 'bar' }, logger });
    const { id } = onlyWorker().posted[0];
    onlyWorker().emit('message', { id, ok: true, warnings: ['a minor warning'] });

    await expect(promise).resolves.toEqual({ error: undefined, warnings: ['a minor warning'] });
  });

  it('resolves with the error when the worker rejects the spec', async () => {
    const promise = validateVegaSpec({ spec: { mark: 'bogus' }, logger });
    const { id } = onlyWorker().posted[0];
    onlyWorker().emit('message', { id, ok: false, error: 'Unrecognized mark bogus' });

    await expect(promise).resolves.toEqual({ error: 'Unrecognized mark bogus', warnings: [] });
  });

  it('caps the rows sent to the worker', async () => {
    const rows = Array.from({ length: 500 }, (_, i) => ({ i }));
    const promise = validateVegaSpec({ spec: { mark: 'bar' }, rows, logger });
    const posted = onlyWorker().posted[0];

    expect(posted.rows).toHaveLength(200);
    onlyWorker().emit('message', { id: posted.id, ok: true, warnings: [] });
    await promise;
  });

  it('fails open (no error) when validation times out', async () => {
    jest.useFakeTimers();
    try {
      const promise = validateVegaSpec({ spec: { mark: 'bar' }, logger });
      jest.advanceTimersByTime(10_000);
      await expect(promise).resolves.toEqual({ warnings: [] });
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('timed out'));
    } finally {
      jest.useRealTimers();
    }
  });

  it('fails open for all in-flight requests when the worker errors', async () => {
    const promise = validateVegaSpec({ spec: { mark: 'bar' }, logger });
    onlyWorker().emit('error', new Error('worker crashed'));

    await expect(promise).resolves.toEqual({ warnings: [] });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('worker crashed'));
  });
});
