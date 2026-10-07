/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import { Agent } from 'undici';
import { loggerMock } from '@kbn/logging-mocks';
import { renderPage } from './client';
import type { RenderPageRequest } from './types';

const payload: RenderPageRequest = {
  url: 'https://kibana.example.com/app/reportingRedirect',
  output: { format: 'pdf' },
};
const pdfResponse = (init: ResponseInit = {}) =>
  new Response('bytes', {
    ...init,
    headers: { 'content-type': 'application/pdf', ...init.headers },
  });
const logger = loggerMock.create();

describe('renderPage', () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  const config = {
    url: 'http://localhost:3001',
    createToken: jest.fn(async () => 'token'),
  };

  it('posts the payload with a bearer token and the dispatcher', async () => {
    fetchMock.mockResolvedValue(pdfResponse());
    const dispatcher = new Agent();

    await firstValueFrom(renderPage(payload, { ...config, dispatcher }, null, logger));

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/v1/render-page',
      expect.objectContaining({
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer token' },
        body: JSON.stringify(payload),
        dispatcher,
      })
    );
  });

  it('tolerates a trailing slash on the service url', async () => {
    fetchMock.mockResolvedValue(pdfResponse());

    await firstValueFrom(
      renderPage(payload, { ...config, url: 'http://localhost:3001/' }, null, logger)
    );

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3001/v1/render-page');
  });

  it('returns the body and no render errors on success', async () => {
    fetchMock.mockResolvedValue(pdfResponse());

    const result = await firstValueFrom(renderPage(payload, config, null, logger));

    expect(result).toEqual({ data: Buffer.from('bytes'), renderErrors: [] });
  });

  it('reports the panel render error count from x-render-errors', async () => {
    fetchMock.mockResolvedValue(pdfResponse({ headers: { 'x-render-errors': '2' } }));

    const result = await firstValueFrom(renderPage(payload, config, null, logger));

    expect(result.renderErrors).toEqual(['2 panel(s) reported a render error']);
  });

  it('accepts a content type with parameters', async () => {
    fetchMock.mockResolvedValue(
      new Response('bytes', { headers: { 'content-type': 'application/pdf; charset=binary' } })
    );

    await expect(firstValueFrom(renderPage(payload, config, null, logger))).resolves.toEqual({
      data: Buffer.from('bytes'),
      renderErrors: [],
    });
  });

  it('expects image/png for png output', async () => {
    fetchMock.mockResolvedValue(
      new Response('bytes', { headers: { 'content-type': 'image/png' } })
    );

    await expect(
      firstValueFrom(renderPage({ ...payload, output: { format: 'png' } }, config, null, logger))
    ).resolves.toMatchObject({ data: Buffer.from('bytes') });
  });

  it('rejects a successful response with the wrong content type', async () => {
    fetchMock.mockResolvedValue(
      new Response('<html></html>', { headers: { 'content-type': 'text/html' } })
    );

    await expect(firstValueFrom(renderPage(payload, config, null, logger))).rejects.toThrow(
      'page-render-service returned text/html, expected application/pdf'
    );
  });

  it('includes the error, phase and document status from a JSON error body', async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { error: 'Navigation failed', phase: 'navigation', documentStatus: 403 },
        { status: 502 }
      )
    );

    await expect(firstValueFrom(renderPage(payload, config, null, logger))).rejects.toThrow(
      'page-render-service request failed: 502 Navigation failed (phase: navigation, documentStatus: 403)'
    );
  });

  it('falls back to the status text when the error body is not the expected JSON', async () => {
    fetchMock.mockResolvedValue(
      new Response('<html>oops</html>', { status: 500, statusText: 'Internal Server Error' })
    );

    await expect(firstValueFrom(renderPage(payload, config, null, logger))).rejects.toThrow(
      'page-render-service request failed: 500 Internal Server Error'
    );
  });

  it('fails without calling the service when a token cannot be minted', async () => {
    const createToken = jest.fn(async () => {
      throw new Error('UIAM unavailable');
    });

    await expect(
      firstValueFrom(renderPage(payload, { ...config, createToken }, null, logger))
    ).rejects.toThrow('UIAM unavailable');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('aborts the request when unsubscribed', async () => {
    let signal: AbortSignal | undefined;
    fetchMock.mockImplementation((_url: string, init: RequestInit) => {
      signal = init.signal ?? undefined;
      return new Promise(() => {});
    });

    const subscription = renderPage(payload, config, null, logger).subscribe();
    await new Promise(process.nextTick);
    subscription.unsubscribe();

    expect(signal?.aborted).toBe(true);
  });
});
