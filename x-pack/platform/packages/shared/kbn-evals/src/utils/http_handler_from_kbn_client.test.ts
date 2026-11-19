/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import { KbnClientRequesterError } from '@kbn/kbn-client';
import type { ToolingLog } from '@kbn/tooling-log';
import { httpHandlerFromKbnClient, isTransportError } from './http_handler_from_kbn_client';

// Shape thrown by KbnClientRequester when Kibana closes the socket before responding.
const socketClosedError = () => {
  const socketError = Object.assign(new Error('other side closed'), { code: 'UND_ERR_SOCKET' });
  const fetchError = new TypeError('fetch failed', { cause: socketError });
  return new KbnClientRequesterError(
    '[POST http://localhost:5620/internal/inference/chat_complete] request failed -- Status: N/A, Cause: fetch failed -- and ran out of retries',
    { cause: fetchError }
  );
};

const abortError = () =>
  new KbnClientRequesterError('aborted', {
    cause: Object.assign(new Error('This operation was aborted'), { name: 'AbortError' }),
  });

const createFetch = (request: jest.Mock) =>
  httpHandlerFromKbnClient({
    kbnClient: { request, resolveUrl: (p: string) => p } as unknown as KbnClient,
    log: { debug: jest.fn(), warning: jest.fn(), error: jest.fn() } as unknown as ToolingLog,
  });

const ok = (data: unknown) => ({ data, status: 200, statusText: 'OK' });

describe('httpHandlerFromKbnClient retries', () => {
  const originalRetries = process.env.KBN_EVALS_HTTP_RETRIES;

  beforeEach(() => {
    jest.useFakeTimers();
    delete process.env.KBN_EVALS_HTTP_RETRIES;
  });

  afterEach(() => {
    jest.useRealTimers();
    if (originalRetries === undefined) {
      delete process.env.KBN_EVALS_HTTP_RETRIES;
    } else {
      process.env.KBN_EVALS_HTTP_RETRIES = originalRetries;
    }
  });

  const run = async <T>(promise: Promise<T>) => {
    const settled = promise.then(
      (value) => ({ value }),
      (error) => ({ error })
    );
    await jest.runAllTimersAsync();
    return settled;
  };

  it('retries an inference call whose connection closed before a response', async () => {
    const request = jest
      .fn()
      .mockRejectedValueOnce(socketClosedError())
      .mockResolvedValueOnce(ok({ content: 'ok' }));

    const result = await run(
      createFetch(request)('/internal/inference/chat_complete', {
        method: 'POST',
        body: JSON.stringify({ connectorId: 'x' }),
      })
    );

    expect(result).toEqual({ value: { content: 'ok' } });
    expect(request).toHaveBeenCalledTimes(2);
    // the inner kbn-client retry loop stays off: this handler owns the retries
    expect(request.mock.calls[0][0]).toMatchObject({ retries: 0 });
  });

  it('retries transport failures by default, within a bounded budget', async () => {
    const request = jest.fn().mockRejectedValue(socketClosedError());

    const result = await run(
      createFetch(request)('/internal/inference/chat_complete', { method: 'POST' })
    );

    expect(result).toHaveProperty('error');
    // initial attempt + the default budget of 2
    expect(request).toHaveBeenCalledTimes(3);
  });

  it('honors KBN_EVALS_HTTP_RETRIES', async () => {
    process.env.KBN_EVALS_HTTP_RETRIES = '3';
    const request = jest.fn().mockRejectedValue(socketClosedError());

    await run(createFetch(request)('/internal/inference/chat_complete', { method: 'POST' }));

    expect(request).toHaveBeenCalledTimes(4);
  });

  it('treats KBN_EVALS_HTTP_RETRIES=0 as retries off', async () => {
    process.env.KBN_EVALS_HTTP_RETRIES = '0';
    const request = jest.fn().mockRejectedValue(socketClosedError());

    await run(createFetch(request)('/internal/inference/chat_complete', { method: 'POST' }));

    expect(request).toHaveBeenCalledTimes(1);
  });

  it('retries a GET after a transport failure', async () => {
    const request = jest
      .fn()
      .mockRejectedValueOnce(socketClosedError())
      .mockResolvedValueOnce(ok('ok'));

    const result = await run(createFetch(request)('/api/workflows/executions/abc'));

    expect(result).toEqual({ value: 'ok' });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('does not resend a POST outside the inference API after a transport failure', async () => {
    const request = jest.fn().mockRejectedValue(socketClosedError());

    const result = await run(
      createFetch(request)('/api/workflows/workflow/abc/run', { method: 'POST', body: '{}' })
    );

    expect(result).toHaveProperty('error');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('does not retry a request the caller aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const request = jest.fn().mockRejectedValue(socketClosedError());

    await run(
      createFetch(request)('/internal/inference/chat_complete', {
        method: 'POST',
        signal: controller.signal,
      })
    );

    expect(request).toHaveBeenCalledTimes(1);
  });

  it('does not retry an abort error', async () => {
    const request = jest.fn().mockRejectedValue(abortError());

    await run(createFetch(request)('/internal/inference/chat_complete', { method: 'POST' }));

    expect(request).toHaveBeenCalledTimes(1);
  });

  it('fails a malformed body without sending or retrying', async () => {
    const request = jest.fn();

    const result = await run(
      createFetch(request)('/internal/inference/chat_complete', {
        method: 'POST',
        body: '{not json',
      })
    );

    expect(result).toEqual({ error: expect.any(SyntaxError) });
    expect(request).not.toHaveBeenCalled();
  });

  it('does not retry an HTTP error status outside the retryable set', async () => {
    const request = jest
      .fn()
      .mockRejectedValue(new KbnClientRequesterError('bad request', { status: 400 }));

    const result = await run(
      createFetch(request)('/internal/inference/chat_complete', { method: 'POST' })
    );

    expect(result).toHaveProperty('error');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('retries a 503 on any route', async () => {
    const request = jest
      .fn()
      .mockRejectedValueOnce(new KbnClientRequesterError('unavailable', { status: 503 }))
      .mockResolvedValueOnce(ok('ok'));

    const result = await run(
      createFetch(request)('/api/workflows/workflow/abc/run', { method: 'POST' })
    );

    expect(result).toEqual({ value: 'ok' });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('does not resend a POST outside the inference API after a 504', async () => {
    const request = jest
      .fn()
      .mockRejectedValue(new KbnClientRequesterError('gateway timeout', { status: 504 }));

    const result = await run(
      createFetch(request)('/api/workflows/workflow/abc/run', { method: 'POST' })
    );

    expect(result).toHaveProperty('error');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('retries an inference call after a 504', async () => {
    const request = jest
      .fn()
      .mockRejectedValueOnce(new KbnClientRequesterError('gateway timeout', { status: 504 }))
      .mockResolvedValueOnce(ok('ok'));

    const result = await run(
      createFetch(request)('/internal/inference/chat_complete', { method: 'POST' })
    );

    expect(result).toEqual({ value: 'ok' });
    expect(request).toHaveBeenCalledTimes(2);
  });
});

describe('isTransportError', () => {
  it('detects a closed socket through the error cause chain', () => {
    expect(isTransportError(socketClosedError())).toBe(true);
  });

  it('detects a bare fetch failure', () => {
    expect(isTransportError(new TypeError('fetch failed'))).toBe(true);
  });

  it('detects a connection error code without a fetch failure', () => {
    const reset = Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' });
    expect(isTransportError(new KbnClientRequesterError('reset', { cause: reset }))).toBe(true);
  });

  it('ignores caller aborts', () => {
    expect(isTransportError(abortError())).toBe(false);
  });

  it('ignores errors that carry an HTTP status', () => {
    expect(isTransportError(new KbnClientRequesterError('nope', { status: 500 }))).toBe(false);
  });

  it('ignores errors unrelated to the connection', () => {
    expect(isTransportError(new SyntaxError('Unexpected token'))).toBe(false);
  });
});
