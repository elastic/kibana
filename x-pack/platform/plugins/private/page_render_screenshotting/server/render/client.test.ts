/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import { Agent } from 'undici';
import { loggerMock } from '@kbn/logging-mocks';
import {
  RenderCapacityTimeoutError,
  RenderFailedError,
  RenderRequestRejectedError,
  RenderServiceSaturatedError,
  RenderServiceUnavailableError,
} from '@kbn/reporting-common';
import { renderPage } from './client';
import { pageRenderTelemetry } from './telemetry';
import type { RenderPageRequest } from './types';

jest.mock('./telemetry', () => ({ pageRenderTelemetry: { recordCapacityWait: jest.fn() } }));

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

    await firstValueFrom(renderPage(payload, { ...config, dispatcher }, {}, logger));

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/v1/render-page',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer token',
          'x-render-retry-interval-ms': '2000',
        },
        body: JSON.stringify(payload),
        dispatcher,
      })
    );
  });

  it('tolerates a trailing slash on the service url', async () => {
    fetchMock.mockResolvedValue(pdfResponse());

    await firstValueFrom(
      renderPage(payload, { ...config, url: 'http://localhost:3001/' }, {}, logger)
    );

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3001/v1/render-page');
  });

  it('returns the body and no render errors on success', async () => {
    fetchMock.mockResolvedValue(pdfResponse());

    const result = await firstValueFrom(renderPage(payload, config, {}, logger));

    expect(result).toEqual({ data: Buffer.from('bytes'), renderErrors: [] });
  });

  it('reports the panel render error count from x-render-errors', async () => {
    fetchMock.mockResolvedValue(pdfResponse({ headers: { 'x-render-errors': '2' } }));

    const result = await firstValueFrom(renderPage(payload, config, {}, logger));

    expect(result.renderErrors).toEqual(['2 panel(s) reported a render error']);
  });

  it('accepts a content type with parameters', async () => {
    fetchMock.mockResolvedValue(
      new Response('bytes', { headers: { 'content-type': 'application/pdf; charset=binary' } })
    );

    await expect(firstValueFrom(renderPage(payload, config, {}, logger))).resolves.toEqual({
      data: Buffer.from('bytes'),
      renderErrors: [],
    });
  });

  it('expects image/png for png output', async () => {
    fetchMock.mockResolvedValue(
      new Response('bytes', { headers: { 'content-type': 'image/png' } })
    );

    await expect(
      firstValueFrom(renderPage({ ...payload, output: { format: 'png' } }, config, {}, logger))
    ).resolves.toMatchObject({ data: Buffer.from('bytes') });
  });

  it('rejects a successful response with the wrong content type', async () => {
    fetchMock.mockResolvedValue(
      new Response('<html></html>', { headers: { 'content-type': 'text/html' } })
    );

    await expect(firstValueFrom(renderPage(payload, config, {}, logger))).rejects.toThrow(
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

    await expect(firstValueFrom(renderPage(payload, config, {}, logger))).rejects.toThrow(
      'page-render-service request failed: 502 Navigation failed (phase: navigation, documentStatus: 403)'
    );
  });

  it('falls back to the status text when the error body is not the expected JSON', async () => {
    fetchMock.mockResolvedValue(
      new Response('<html>oops</html>', { status: 500, statusText: 'Internal Server Error' })
    );

    await expect(firstValueFrom(renderPage(payload, config, {}, logger))).rejects.toThrow(
      'page-render-service request failed: 500 Internal Server Error'
    );
  });

  it('treats a token UIAM could not mint as an unavailable service, without calling it', async () => {
    const createToken = jest.fn(async () => {
      throw new Error('UIAM unavailable');
    });

    const error = await firstValueFrom(
      renderPage(payload, { ...config, createToken }, {}, logger)
    ).catch((e: Error) => e);

    expect(error).toBeInstanceOf(RenderServiceUnavailableError);
    expect((error as Error).message).toContain('UIAM unavailable');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps the class of a token failure that already has one', async () => {
    const createToken = jest.fn(async () => {
      throw new RenderRequestRejectedError('not configured');
    });

    await expect(
      firstValueFrom(renderPage(payload, { ...config, createToken }, {}, logger))
    ).rejects.toBeInstanceOf(RenderRequestRejectedError);
  });

  it('aborts the request when unsubscribed', async () => {
    let signal: AbortSignal | undefined;
    fetchMock.mockImplementation((_url: string, init: RequestInit) => {
      signal = init.signal ?? undefined;
      return new Promise(() => {});
    });

    const subscription = renderPage(payload, config, {}, logger).subscribe();
    await new Promise(process.nextTick);
    subscription.unsubscribe();

    expect(signal?.aborted).toBe(true);
  });
  describe('retry ladder', () => {
    const NOW = Date.parse('2026-10-14T12:00:00Z');
    const MINUTE = 60_000;
    const saturated = () =>
      Response.json(
        { error: 'Render capacity saturated, retry later' },
        { status: 429, headers: { 'x-page-render-service-rejection': 'saturated' } }
      );
    const reportAged = (ageMs: number) => ({
      report: { id: 'report-1', createdAt: new Date(NOW - ageMs) },
      canHandBack: true,
    });
    const sentHeader = (call: number, name: string) =>
      (fetchMock.mock.calls[call][1] as RequestInit & { headers: Record<string, string> }).headers[
        name
      ];

    beforeEach(() => {
      jest.useFakeTimers({ now: NOW });
      // No jitter: every wait is exactly the retry interval.
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
      (pageRenderTelemetry.recordCapacityWait as jest.Mock).mockClear();
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.spyOn(Math, 'random').mockRestore();
    });

    /** Resolves to the result or the error, so neither goes unhandled. */
    function start(context: Parameters<typeof renderPage>[2]) {
      return firstValueFrom(renderPage(payload, config, context, logger)).catch(
        (error: Error) => error
      );
    }

    it('waits out a saturated service at the fast interval, then renders', async () => {
      fetchMock
        .mockImplementationOnce(async () => saturated())
        .mockImplementationOnce(async () => saturated())
        .mockImplementation(async () => pdfResponse());

      const result = start(reportAged(0));
      await jest.advanceTimersByTimeAsync(3_999);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      await jest.advanceTimersByTimeAsync(1);

      await expect(result).resolves.toEqual({ data: Buffer.from('bytes'), renderErrors: [] });
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('sends one token with every capacity retry in a run', async () => {
      const createToken = jest.fn(async () => 'token');
      fetchMock
        .mockImplementationOnce(async () => saturated())
        .mockImplementationOnce(async () => saturated())
        .mockImplementation(async () => pdfResponse());

      const result = firstValueFrom(
        renderPage(payload, { ...config, createToken }, reportAged(0), logger)
      );
      await jest.advanceTimersByTimeAsync(4_000);

      await expect(result).resolves.toMatchObject({ data: Buffer.from('bytes') });
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(createToken).toHaveBeenCalledTimes(1);
    });

    it('sends the retry interval and the report ID on every request', async () => {
      fetchMock
        .mockImplementationOnce(async () => saturated())
        .mockImplementation(async () => pdfResponse());

      const result = start(reportAged(0));
      await jest.advanceTimersByTimeAsync(2_000);
      await result;

      for (const call of [0, 1]) {
        expect(sentHeader(call, 'x-render-retry-interval-ms')).toBe('2000');
        expect(sentHeader(call, 'x-report-id')).toBe('report-1');
      }
    });

    it('retries at the slow interval once the report has waited four minutes', async () => {
      fetchMock
        .mockImplementationOnce(async () => saturated())
        .mockImplementation(async () => pdfResponse());

      const result = start(reportAged(4 * MINUTE));
      await jest.advanceTimersByTimeAsync(9_999);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(1);
      await result;

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(sentHeader(0, 'x-render-retry-interval-ms')).toBe('10000');
    });

    it('treats a draining pod like a saturated one', async () => {
      fetchMock
        .mockImplementationOnce(async () =>
          Response.json(
            { error: 'Shutting down, retry on another instance' },
            { status: 503, headers: { 'x-page-render-service-rejection': 'draining' } }
          )
        )
        .mockImplementation(async () => pdfResponse());

      const result = start(reportAged(0));
      await jest.advanceTimersByTimeAsync(2_000);

      await expect(result).resolves.toMatchObject({ data: Buffer.from('bytes') });
    });

    /** Holding a worker for the whole ladder would starve every other task type. */
    it('hands the worker back after a minute of waiting in one run', async () => {
      fetchMock.mockImplementation(async () => saturated());

      const result = start(reportAged(0));
      await jest.advanceTimersByTimeAsync(MINUTE);

      expect(await result).toBeInstanceOf(RenderServiceSaturatedError);
      expect(fetchMock).toHaveBeenCalledTimes(31);
    });

    it('keeps waiting past a minute when the task cannot hand back', async () => {
      fetchMock.mockImplementation(async () =>
        Date.now() < NOW + 90_000 ? saturated() : pdfResponse()
      );

      const result = start({
        ...reportAged(0),
        canHandBack: false,
        retryAt: new Date(NOW + 15 * MINUTE),
      });
      await jest.advanceTimersByTimeAsync(90_000);

      await expect(result).resolves.toMatchObject({ data: Buffer.from('bytes') });
      expect(fetchMock).toHaveBeenCalledTimes(46);
    });

    it('waits less when the task deadline would not leave room for the render', async () => {
      fetchMock.mockImplementation(async () => saturated());

      // A 4m queue timeout: 225s to the deadline, less 180s for the render.
      const result = start({ ...reportAged(0), retryAt: new Date(NOW + 4 * MINUTE) });
      await jest.advanceTimersByTimeAsync(45_000);

      expect(await result).toBeInstanceOf(RenderServiceSaturatedError);
      expect(fetchMock).toHaveBeenCalledTimes(23);
    });

    it('gives up once the report has waited ten minutes, counted from its creation', async () => {
      fetchMock.mockImplementation(async () => saturated());

      const error = await start(reportAged(10 * MINUTE - 5_000));

      expect(error).toBeInstanceOf(RenderCapacityTimeoutError);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('stops waiting when unsubscribed', async () => {
      fetchMock.mockImplementation(async () => saturated());

      const subscription = renderPage(payload, config, reportAged(0), logger).subscribe({
        error: () => {},
      });
      await jest.advanceTimersByTimeAsync(1_000);
      subscription.unsubscribe();
      await jest.advanceTimersByTimeAsync(10_000);

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('records how long the report waited for a render slot', async () => {
      fetchMock
        .mockImplementationOnce(async () => saturated())
        .mockImplementation(async () => pdfResponse());

      const result = start(reportAged(30_000));
      await jest.advanceTimersByTimeAsync(2_000);
      await result;

      expect(pageRenderTelemetry.recordCapacityWait).toHaveBeenCalledTimes(1);
      expect(pageRenderTelemetry.recordCapacityWait).toHaveBeenCalledWith(32);
    });

    it('measures the wait from when a failed render restarted it', async () => {
      fetchMock.mockImplementation(async () => pdfResponse());

      await start({
        report: {
          id: 'report-1',
          createdAt: new Date(NOW - 5 * MINUTE),
          waitingSince: new Date(NOW - 10_000),
        },
        canHandBack: true,
      });

      expect(pageRenderTelemetry.recordCapacityWait).toHaveBeenCalledWith(10);
    });

    it.each([
      ['a proxy 503', 503, undefined, RenderServiceUnavailableError, false],
      ['a render failure', 500, { error: 'boom', phase: 'pdf' }, RenderFailedError, true],
      [
        'an invalid request',
        400,
        { error: 'bad', phase: 'navigation' },
        RenderRequestRejectedError,
        false,
      ],
      [
        'Kibana refusing the page',
        502,
        { error: 'Navigation failed', phase: 'navigation', documentStatus: 403 },
        RenderRequestRejectedError,
        true,
      ],
    ])(
      'fails at once on %s, with an error that says how to retry',
      async (_n, status, body, type, tookSlot) => {
        fetchMock.mockImplementation(async () =>
          body ? Response.json(body, { status }) : new Response('', { status })
        );

        expect(await start(reportAged(0))).toBeInstanceOf(type);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        // Only a request that took a render slot ended a wait for one.
        expect(pageRenderTelemetry.recordCapacityWait).toHaveBeenCalledTimes(tookSlot ? 1 : 0);
      }
    );

    it('reports an unreachable service as unavailable, with the network error', async () => {
      fetchMock.mockRejectedValue(
        new TypeError('fetch failed', {
          cause: Object.assign(new Error(), { code: 'ECONNREFUSED' }),
        })
      );

      const error = await start(reportAged(0));

      expect(error).toBeInstanceOf(RenderServiceUnavailableError);
      expect((error as Error).message).toContain('fetch failed (ECONNREFUSED)');
    });
  });
});
