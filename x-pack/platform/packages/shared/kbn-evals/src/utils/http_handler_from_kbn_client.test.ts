/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import type { ToolingLog } from '@kbn/tooling-log';
import { httpHandlerFromKbnClient } from './http_handler_from_kbn_client';

const log = { warning: jest.fn() } as unknown as ToolingLog;

const networkFailure = () => new TypeError('fetch failed');

const statusFailure = (status: number) =>
  Object.assign(new Error(`[POST /internal/inference/chat_complete] ${status}`), { status });

const createKbnClient = (request: jest.Mock): KbnClient =>
  ({ request, resolveUrl: (p: string) => p } as unknown as KbnClient);

describe('httpHandlerFromKbnClient retry budget', () => {
  const originalEnv = process.env.KBN_EVALS_HTTP_RETRIES;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.KBN_EVALS_HTTP_RETRIES;
    } else {
      process.env.KBN_EVALS_HTTP_RETRIES = originalEnv;
    }
    jest.clearAllMocks();
  });

  it('retries a network-level failure and recovers', async () => {
    process.env.KBN_EVALS_HTTP_RETRIES = '1';
    const request = jest
      .fn()
      .mockRejectedValueOnce(networkFailure())
      .mockResolvedValueOnce({ data: { ok: true }, status: 200, statusText: 'OK' });
    const fetch = httpHandlerFromKbnClient({ kbnClient: createKbnClient(request), log });

    const result = await fetch({ path: '/internal/inference/chat_complete', method: 'POST' });

    expect(result).toEqual({ ok: true });
    expect(request).toHaveBeenCalledTimes(2);
    // the inner kbn-client retry loop stays off: this handler owns the retries
    expect(request.mock.calls[0][0]).toMatchObject({ retries: 0 });
  });

  it('retries network-level failures by default (no env override)', async () => {
    delete process.env.KBN_EVALS_HTTP_RETRIES;
    const request = jest.fn().mockRejectedValue(networkFailure());
    const fetch = httpHandlerFromKbnClient({ kbnClient: createKbnClient(request), log });

    await expect(
      fetch({ path: '/internal/inference/chat_complete', method: 'POST' })
    ).rejects.toThrow('fetch failed');

    // initial attempt + the default bounded budget, never an unbounded loop
    expect(request).toHaveBeenCalledTimes(3);
  });

  it('does not retry a deterministic non-retryable status', async () => {
    delete process.env.KBN_EVALS_HTTP_RETRIES;
    const request = jest.fn().mockRejectedValue(statusFailure(400));
    const fetch = httpHandlerFromKbnClient({ kbnClient: createKbnClient(request), log });

    await expect(
      fetch({ path: '/internal/inference/chat_complete', method: 'POST' })
    ).rejects.toThrow(/400/);

    expect(request).toHaveBeenCalledTimes(1);
  });

  it('honors KBN_EVALS_HTTP_RETRIES=0 as retries off', async () => {
    process.env.KBN_EVALS_HTTP_RETRIES = '0';
    const request = jest.fn().mockRejectedValue(networkFailure());
    const fetch = httpHandlerFromKbnClient({ kbnClient: createKbnClient(request), log });

    await expect(
      fetch({ path: '/internal/inference/chat_complete', method: 'POST' })
    ).rejects.toThrow('fetch failed');

    expect(request).toHaveBeenCalledTimes(1);
  });
});
