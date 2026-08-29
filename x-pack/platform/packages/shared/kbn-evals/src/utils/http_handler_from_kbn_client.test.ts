/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { httpHandlerFromKbnClient } from './http_handler_from_kbn_client';

/**
 * A dead transport arrives with no HTTP status, so the retry predicate used to
 * skip it entirely: glm-5-2 lost 19 of 21 examples 58 minutes into a sweep when
 * Kibana stopped answering and every remaining call failed as
 * `Status: N/A, Cause: fetch failed`.
 */
describe('httpHandlerFromKbnClient transport retries', () => {
  const log = new ToolingLog({ level: 'silent', writeTo: process.stdout });

  const makeError = (message: string, status?: number) =>
    Object.assign(new Error(message), { status, headers: undefined });

  const kbnClient = (request: jest.Mock) => ({ request } as never);

  beforeEach(() => {
    process.env.KBN_EVALS_HTTP_RETRIES = '2';
  });

  afterEach(() => {
    delete process.env.KBN_EVALS_HTTP_RETRIES;
  });

  it('retries a status-less "fetch failed" and succeeds', async () => {
    const request = jest
      .fn()
      .mockRejectedValueOnce(makeError('request failed -- Status: N/A, Cause: fetch failed'))
      .mockResolvedValueOnce({ data: { ok: true }, status: 200, statusText: 'OK', headers: {} });

    const handler = httpHandlerFromKbnClient({ kbnClient: kbnClient(request), log });
    await handler('/api/agent_builder/converse', { method: 'POST' });

    expect(request).toHaveBeenCalledTimes(2);
  });

  it('retries a socket hang up', async () => {
    const request = jest
      .fn()
      .mockRejectedValueOnce(makeError('socket hang up'))
      .mockResolvedValueOnce({ data: {}, status: 200, statusText: 'OK', headers: {} });

    const handler = httpHandlerFromKbnClient({ kbnClient: kbnClient(request), log });
    await handler('/api/agent_builder/converse', { method: 'POST' });

    expect(request).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry a status-less programming error', async () => {
    const request = jest.fn().mockRejectedValue(new TypeError('x.map is not a function'));

    const handler = httpHandlerFromKbnClient({ kbnClient: kbnClient(request), log });
    await expect(handler('/api/agent_builder/converse', { method: 'POST' })).rejects.toThrow(
      'x.map is not a function'
    );

    expect(request).toHaveBeenCalledTimes(1);
  });

  it('still retries a 503 and still refuses a 400', async () => {
    const ok = { data: {}, status: 200, statusText: 'OK', headers: {} };
    const retried = jest
      .fn()
      .mockRejectedValueOnce(makeError('service unavailable', 503))
      .mockResolvedValueOnce(ok);
    const handler = httpHandlerFromKbnClient({ kbnClient: kbnClient(retried), log });
    await handler('/api/x', { method: 'POST' });
    expect(retried).toHaveBeenCalledTimes(2);

    const refused = jest.fn().mockRejectedValue(makeError('bad request', 400));
    const handler2 = httpHandlerFromKbnClient({ kbnClient: kbnClient(refused), log });
    await expect(handler2('/api/x', { method: 'POST' })).rejects.toThrow('bad request');
    expect(refused).toHaveBeenCalledTimes(1);
  });
});
