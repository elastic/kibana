/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { DecisionProviderParams, DecisionProviderResult } from './types';
import {
  DecisionProviderAbortedError,
  DecisionProviderUnavailableError,
  isDecisionProviderAbortedError,
} from './types';
import type { BaseDecisionProviderOptions } from './base_decision_provider';
import { BaseDecisionProvider } from './base_decision_provider';

const HOUR = 60 * 60 * 1000;

const answered: DecisionProviderResult = {
  inferenceId: 'model-1',
  answers: [{ type: 'predicate', probability: 0.9 }],
};

class TestProvider extends BaseDecisionProvider {
  readonly id = 'eis';

  readonly handler = jest.fn<Promise<DecisionProviderResult>, [DecisionProviderParams]>(
    async () => answered
  );

  constructor(options: Partial<BaseDecisionProviderOptions> = {}) {
    super({ timeoutMs: 1000, unavailableTtlMs: HOUR, ...options });
  }

  protected ask(params: DecisionProviderParams): Promise<DecisionProviderResult> {
    return this.handler(params);
  }
}

const never = () => new Promise<never>(() => {});

const attempt = (provider: TestProvider, abortSignal?: AbortSignal) =>
  provider.decide({
    request: httpServerMock.createKibanaRequest(),
    input: 'hello',
    questions: [{ type: 'predicate', instructions: 'Respond?' }],
    abortSignal,
  });

describe('BaseDecisionProvider', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns what the provider answers', async () => {
    const provider = new TestProvider();

    await expect(attempt(provider)).resolves.toEqual(answered);
  });

  it('times out after the timeout it is given and aborts the call', async () => {
    jest.useFakeTimers();

    const provider = new TestProvider();
    let signal: AbortSignal | undefined;

    provider.handler.mockImplementation((params) => {
      signal = params.signal;
      return never();
    });

    const pending = attempt(provider).catch((error) => error);

    await jest.advanceTimersByTimeAsync(1000);

    const error = await pending;

    expect(isDecisionProviderAbortedError(error)).toBe(true);
    expect(error.message).toContain('timed out after 1000ms');
    expect(signal?.aborted).toBe(true);
  });

  it('waits for the timeout it was created with', async () => {
    jest.useFakeTimers();

    const provider = new TestProvider({ timeoutMs: 2000 });
    let settled = false;

    provider.handler.mockImplementation(never);

    const pending = attempt(provider)
      .catch((error) => error)
      .finally(() => {
        settled = true;
      });

    await jest.advanceTimersByTimeAsync(1000);
    expect(settled).toBe(false);

    await jest.advanceTimersByTimeAsync(1000);
    await expect(pending).resolves.toBeInstanceOf(DecisionProviderAbortedError);
  });

  it('aborts the call when the caller aborts', async () => {
    const provider = new TestProvider();
    const controller = new AbortController();
    let signal: AbortSignal | undefined;

    provider.handler.mockImplementation((params) => {
      signal = params.signal;
      controller.abort();
      return never();
    });

    await expect(attempt(provider, controller.signal)).rejects.toBeInstanceOf(
      DecisionProviderAbortedError
    );
    expect(signal?.aborted).toBe(true);
  });

  it('does not call the provider when the caller already aborted', async () => {
    const provider = new TestProvider();
    const controller = new AbortController();

    controller.abort();

    await expect(attempt(provider, controller.signal)).rejects.toBeInstanceOf(
      DecisionProviderAbortedError
    );
    expect(provider.handler).not.toHaveBeenCalled();
  });

  it('is unavailable for unavailableTtlMs after it reports it cannot answer, then retried', async () => {
    jest.useFakeTimers({ now: new Date('2026-11-05T10:00:00Z') });

    const provider = new TestProvider();

    provider.handler.mockRejectedValueOnce(new DecisionProviderUnavailableError('no endpoint'));

    await expect(attempt(provider)).rejects.toBeInstanceOf(DecisionProviderUnavailableError);

    expect(provider.isAvailable()).toBe(false);
    expect(provider.unavailableUntil).toEqual(new Date('2026-11-05T11:00:00Z'));

    jest.setSystemTime(new Date('2026-11-05T10:59:59Z'));
    expect(provider.isAvailable()).toBe(false);

    jest.setSystemTime(new Date('2026-11-05T11:00:00Z'));
    expect(provider.isAvailable()).toBe(true);
    expect(provider.unavailableUntil).toBeUndefined();

    await expect(attempt(provider)).resolves.toEqual(answered);
  });

  it('stays available after a retryable failure', async () => {
    const provider = new TestProvider();

    provider.handler.mockRejectedValueOnce(new Error('boom'));

    await expect(attempt(provider)).rejects.toThrow('boom');
    expect(provider.isAvailable()).toBe(true);
  });
});
