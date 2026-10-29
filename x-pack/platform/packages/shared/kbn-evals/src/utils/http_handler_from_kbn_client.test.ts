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
    '[POST http://localhost:5620/internal/inference/prompt] request failed -- Status: N/A, Cause: fetch failed -- and ran out of retries',
    { cause: fetchError }
  );
};

const createLog = () =>
  ({ debug: jest.fn(), warning: jest.fn(), error: jest.fn() } as unknown as ToolingLog);

const createFetch = (request: jest.Mock) =>
  httpHandlerFromKbnClient({ kbnClient: { request } as unknown as KbnClient, log: createLog() });

describe('httpHandlerFromKbnClient', () => {
  const originalRetries = process.env.KBN_EVALS_HTTP_RETRIES;

  beforeEach(() => {
    jest.useFakeTimers();
    process.env.KBN_EVALS_HTTP_RETRIES = '3';
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

  it('retries an inference prompt call whose socket was closed before a response', async () => {
    const request = jest
      .fn()
      .mockRejectedValueOnce(socketClosedError())
      .mockResolvedValueOnce({ data: { content: 'ok' }, status: 200 });

    const result = await run(
      createFetch(request)('/internal/inference/prompt', {
        method: 'POST',
        body: JSON.stringify({ connectorId: 'x' }),
      })
    );

    expect(result).toEqual({ value: { content: 'ok' } });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('does not resend a non-idempotent POST outside the inference API after a transport error', async () => {
    const request = jest.fn().mockRejectedValue(socketClosedError());

    const result = await run(
      createFetch(request)('/api/workflows/run', { method: 'POST', body: '{}' })
    );

    expect(result).toHaveProperty('error');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('does not retry an HTTP error status outside the retryable set', async () => {
    const request = jest
      .fn()
      .mockRejectedValue(new KbnClientRequesterError('bad request', { status: 400 }));

    const result = await run(
      createFetch(request)('/internal/inference/prompt', { method: 'POST' })
    );

    expect(result).toHaveProperty('error');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('still retries 503 responses', async () => {
    const request = jest
      .fn()
      .mockRejectedValueOnce(new KbnClientRequesterError('unavailable', { status: 503 }))
      .mockResolvedValueOnce({ data: 'ok', status: 200 });

    const result = await run(createFetch(request)('/api/status'));

    expect(result).toEqual({ value: 'ok' });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('stops after KBN_EVALS_HTTP_RETRIES transport failures', async () => {
    const request = jest.fn().mockRejectedValue(socketClosedError());

    const result = await run(
      createFetch(request)('/internal/inference/prompt', { method: 'POST' })
    );

    expect(result).toHaveProperty('error');
    expect(request).toHaveBeenCalledTimes(4);
  });
});

describe('isTransportError', () => {
  it('detects a closed socket through the error cause chain', () => {
    expect(isTransportError(socketClosedError())).toBe(true);
  });

  it('ignores caller aborts', () => {
    const abort = Object.assign(new Error('This operation was aborted'), { name: 'AbortError' });
    expect(isTransportError(new KbnClientRequesterError('aborted', { cause: abort }))).toBe(false);
  });

  it('ignores errors that carry an HTTP status', () => {
    expect(isTransportError(new KbnClientRequesterError('nope', { status: 500 }))).toBe(false);
  });
});
