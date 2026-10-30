/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition } from '@elastic/isomer-sdk';

import type { RenderHost } from './client';
import type { HostDrawOptions } from './protocol';
import { createRemoteRenderHost, RenderServiceError, withLocalFallback } from './remote';

const composition = {
  type: 'view',
  body: [{ type: 'markdown', text: 'There are **3** open alerts.' }],
} as unknown as Composition;

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

const reply = (
  status: number,
  body: BodyInit | null,
  headers: Record<string, string> = {}
): Response => new Response(body, { status, headers });

const fetching = (...responses: Array<Response | Error>) => {
  const fetchMock = jest.fn(async () => {
    const next = responses.shift();
    if (next === undefined) {
      throw new Error('no response queued');
    }
    if (next instanceof Error) {
      throw next;
    }
    return next;
  });
  return fetchMock as unknown as jest.MockedFunction<typeof fetch>;
};

const requestOf = (fetchMock: jest.MockedFunction<typeof fetch>, call = 0) => {
  const [url, init] = fetchMock.mock.calls[call];
  return {
    url,
    headers: init?.headers as Record<string, string>,
    body: JSON.parse(init?.body as string),
  };
};

describe('createRemoteRenderHost', () => {
  it('posts the composition, the draw options and the vocabulary, and returns the bytes', async () => {
    const fetchMock = fetching(reply(200, PNG, { 'content-type': 'image/png' }));
    const host = createRemoteRenderHost({
      url: 'http://render.test:3000/',
      vocabulary: 'abc123',
      fetch: fetchMock,
    });
    const bytes = await host.drawPng(composition, { width: 400, theme: 'dark' });
    expect([...bytes]).toEqual([...PNG]);
    const { url, headers, body } = requestOf(fetchMock);
    expect(url).toBe('http://render.test:3000/v1/render-composition');
    expect(headers['content-type']).toBe('application/json');
    expect(headers['x-render-retry-interval-ms']).toBe('500');
    expect(body).toEqual({
      composition,
      options: { width: 400, theme: 'dark', format: 'png' },
      expects: { vocabulary: 'abc123' },
    });
  });

  it('asks for a PDF with drawPdf, and sends no expectation without a vocabulary', async () => {
    const fetchMock = fetching(reply(200, PNG));
    const host = createRemoteRenderHost({ url: 'http://render.test', fetch: fetchMock });
    await host.drawPdf(composition, { metadata: { title: 'Weekly' } });
    const { body } = requestOf(fetchMock);
    expect(body.options).toEqual({ metadata: { title: 'Weekly' }, format: 'pdf' });
    expect(body.expects).toBeUndefined();
  });

  it('retries a saturated answer with a growing interval, then succeeds', async () => {
    const fetchMock = fetching(
      reply(429, '{"error":"busy"}', { 'x-isomer-render-service-rejection': 'saturated' }),
      reply(503, '{"error":"draining"}', { 'x-isomer-render-service-rejection': 'draining' }),
      reply(200, PNG)
    );
    const host = createRemoteRenderHost({
      url: 'http://render.test',
      fetch: fetchMock,
      retryMs: 1,
    });
    await host.drawPng(composition);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(requestOf(fetchMock, 0).headers['x-render-retry-interval-ms']).toBe('1');
    expect(requestOf(fetchMock, 1).headers['x-render-retry-interval-ms']).toBe('2');
    expect(requestOf(fetchMock, 2).headers['x-render-retry-interval-ms']).toBe('4');
  });

  it('gives up as unavailable once the budget is spent', async () => {
    const fetchMock = fetching(
      ...Array.from({ length: 50 }, () =>
        reply(429, null, { 'x-isomer-render-service-rejection': 'saturated' })
      )
    );
    const host = createRemoteRenderHost({
      url: 'http://render.test',
      fetch: fetchMock,
      retryMs: 5,
      timeoutMs: 40,
    });
    await expect(host.drawPng(composition)).rejects.toMatchObject({
      failure: 'unavailable',
      message: 'no render within 40 ms',
    });
  });

  it('reports a network failure as unavailable', async () => {
    const host = createRemoteRenderHost({
      url: 'http://render.test',
      fetch: fetching(new Error('ECONNREFUSED')),
    });
    await expect(host.drawPng(composition)).rejects.toMatchObject({
      failure: 'unavailable',
      message: 'could not reach the render service at http://render.test: ECONNREFUSED',
    });
  });

  it('reports a vocabulary mismatch and a rejection with the service message', async () => {
    const host = createRemoteRenderHost({
      url: 'http://render.test',
      fetch: fetching(
        reply(409, '{"error":"other vocabulary","code":"VOCABULARY_MISMATCH"}'),
        reply(400, '{"error":"bad node","code":"INVALID_COMPOSITION"}'),
        reply(500, 'not json')
      ),
    });
    await expect(host.drawPng(composition)).rejects.toMatchObject({
      failure: 'vocabulary',
      message: 'render service answered 409 VOCABULARY_MISMATCH: other vocabulary',
    });
    await expect(host.drawPng(composition)).rejects.toMatchObject({
      failure: 'rejected',
      message: 'render service answered 400 INVALID_COMPOSITION: bad node',
    });
    await expect(host.drawPng(composition)).rejects.toThrow('render service answered 500: ');
  });

  it('has no pid and rejects after close', async () => {
    const host = createRemoteRenderHost({ url: 'http://render.test', fetch: fetching() });
    expect(host.pid).toBeUndefined();
    await host.close();
    await expect(host.drawPng(composition)).rejects.toThrow('the render host is closed');
  });
});

describe('withLocalFallback', () => {
  const drawing = (bytes: string) =>
    jest.fn(async (_composition: Composition, _options?: Omit<HostDrawOptions, 'format'>) =>
      Buffer.from(bytes)
    );
  const local = (): jest.Mocked<RenderHost> => ({
    drawPng: drawing('local png'),
    drawPdf: drawing('local pdf'),
    pid: 42,
    close: jest.fn(async () => {}),
  });
  const failing = (failure: ConstructorParameters<typeof RenderServiceError>[0]) =>
    createRemoteRenderHost({
      url: 'http://render.test',
      fetch: fetching(
        failure === 'unavailable'
          ? new Error('ECONNREFUSED')
          : reply(failure === 'vocabulary' ? 409 : 400, '{"error":"no"}')
      ),
    });

  it('draws locally when the service is unavailable or on another vocabulary', async () => {
    for (const failure of ['unavailable', 'vocabulary'] as const) {
      const fallback = local();
      const start = jest.fn(async () => fallback);
      const host = withLocalFallback(failing(failure), start);
      expect((await host.drawPdf(composition, { width: 10 })).toString()).toBe('local pdf');
      expect(fallback.drawPdf).toHaveBeenCalledWith(composition, { width: 10 });
    }
  });

  it('does not draw locally what the service rejected', async () => {
    const start = jest.fn(async () => local());
    const host = withLocalFallback(failing('rejected'), start);
    await expect(host.drawPng(composition)).rejects.toBeInstanceOf(RenderServiceError);
    expect(start).not.toHaveBeenCalled();
  });

  it('never starts the local host while the service answers', async () => {
    const start = jest.fn(async () => local());
    const remote = createRemoteRenderHost({
      url: 'http://render.test',
      fetch: fetching(reply(200, PNG)),
    });
    const host = withLocalFallback(remote, start);
    await host.drawPng(composition);
    expect(start).not.toHaveBeenCalled();
    expect(host.pid).toBeUndefined();
  });
});
