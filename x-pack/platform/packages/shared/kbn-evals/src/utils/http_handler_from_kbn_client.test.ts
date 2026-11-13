/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under the
 * terms of the Server Side Public License, v 1.
 */
import { httpHandlerFromKbnClient } from './http_handler_from_kbn_client';

const log = { warning: jest.fn() } as unknown as Parameters<
  typeof httpHandlerFromKbnClient
>[0]['log'];

/** A KbnClient whose requests resolve with an already-parsed JSON body, as the real one does. */
const fakeKbnClient = ({
  data = { message: 'ok' },
  status = 200,
  statusText = 'OK',
}: {
  data?: unknown;
  status?: number;
  statusText?: string;
} = {}) => {
  const calls: Array<{ path: string; body: unknown }> = [];
  return {
    calls,
    request: async ({ path, body }: { path: string; body: unknown }) => {
      calls.push({ path, body });
      return { data, status, statusText, headers: {} };
    },
    resolveUrl: (path: string) => `http://localhost:5601${path}`,
  };
};

describe('httpHandlerFromKbnClient', () => {
  it('returns the parsed body by default', async () => {
    const data = { message: 'ok' };
    const kbnClient = fakeKbnClient({ data });
    const fetch = httpHandlerFromKbnClient({ kbnClient: kbnClient as any, log });
    await expect(fetch('/api/foo')).resolves.toEqual(data);
  });

  it('stringifies the request body for the KbnClient', async () => {
    const kbnClient = fakeKbnClient();
    const fetch = httpHandlerFromKbnClient({ kbnClient: kbnClient as any, log });
    await fetch('/api/foo', { method: 'POST', body: JSON.stringify({ a: 1 }) });
    expect(kbnClient.calls[0].body).toEqual({ a: 1 });
  });

  describe('asResponse', () => {
    // `kbnClient.request` resolves with the body already parsed (it JSON.parses internally), so
    // the reconstructed `Response` must re-serialize it: `new Response(object)` stringifies the
    // object to "[object Object]" and `response.json()` throws SyntaxError (evals build #688).
    it('carries a JSON body `response.json()` can parse', async () => {
      const data = { settings: { solution: 'security' } };
      const kbnClient = fakeKbnClient({ data });
      const fetch = httpHandlerFromKbnClient({ kbnClient: kbnClient as any, log });
      const { response } = await fetch('/api/spaces/space/ad-worker-eval', {
        asResponse: true,
      });
      // `asResponse` always returns a Response; the destructure only looks optional to TS.
      if (response === undefined) throw new Error('asResponse returned no Response');
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual(data);
    });

    it('keeps a null body empty', async () => {
      const kbnClient = fakeKbnClient({ data: null });
      const fetch = httpHandlerFromKbnClient({ kbnClient: kbnClient as any, log });
      const { response } = await fetch('/api/foo', { asResponse: true });
      // `asResponse` always returns a Response; the destructure only looks optional to TS.
      if (response === undefined) throw new Error('asResponse returned no Response');
      expect(response.status).toBe(200);
      await expect(response.text()).resolves.toBe('');
    });

    it('passes a string body through unwrapped', async () => {
      const kbnClient = fakeKbnClient({ data: 'plain text' });
      const fetch = httpHandlerFromKbnClient({ kbnClient: kbnClient as any, log });
      const { response } = await fetch('/api/foo', { asResponse: true });
      if (response === undefined) throw new Error('asResponse returned no Response');
      await expect(response.text()).resolves.toBe('plain text');
    });

    it('keeps a null-body status bodyless even when data is present', async () => {
      const kbnClient = fakeKbnClient({
        data: { stale: 'body' },
        status: 204,
        statusText: 'No Content',
      });
      const fetch = httpHandlerFromKbnClient({ kbnClient: kbnClient as any, log });
      const { response } = await fetch('/api/foo', { asResponse: true });
      if (response === undefined) throw new Error('asResponse returned no Response');
      expect(response.status).toBe(204);
      await expect(response.text()).resolves.toBe('');
    });
  });
});
