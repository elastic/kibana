/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { loggerMock } from '@kbn/logging-mocks';
import { Agent } from 'undici';
import { securityServiceMock } from '@kbn/core-security-server-mocks';
import type { PdfScreenshotOptions, PngScreenshotOptions } from '@kbn/screenshotting-plugin/server';
import { createGetScreenshots, diagnose } from './get_screenshots';
import { renderPage } from './render/client';

jest.mock('./render/client');

const mockRenderPage = renderPage as jest.MockedFunction<typeof renderPage>;

const taskInstanceFields = { retryAt: null, startedAt: null };

function pdfOptions(overrides: Partial<PdfScreenshotOptions> = {}): PdfScreenshotOptions {
  return {
    format: 'pdf',
    browserTimezone: 'UTC',
    layout: { id: 'print' },
    urls: [['http://localhost:5601/app/reportingRedirect', {}]],
    taskInstanceFields,
    ...overrides,
  };
}

function pngOptions(overrides: Partial<PngScreenshotOptions> = {}): PngScreenshotOptions {
  return {
    format: 'png',
    browserTimezone: 'UTC',
    urls: [['http://localhost:5601/app/reportingRedirect', {}]],
    taskInstanceFields,
    ...overrides,
  };
}

describe('createGetScreenshots', () => {
  const logger = loggerMock.create();
  const security = securityServiceMock.createStart();
  const getServiceUrl = () => 'http://localhost:3001';

  const systemIdentity = { createEphemeralToken: jest.fn(async () => 'ephemeral-token') };
  const getSystemIdentity = () => systemIdentity;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps a successful render to a flat PdfScreenshotResult for pdf calls', async () => {
    mockRenderPage.mockReturnValue(Rx.of({ data: Buffer.from('pdf-bytes'), renderErrors: [] }));

    const getScreenshots = createGetScreenshots({
      getServiceUrl,
      logger,
      security,
      getSystemIdentity,
    });
    const result = await firstValueFrom(getScreenshots(pdfOptions()));

    expect(result).toEqual({
      data: Buffer.from('pdf-bytes'),
      errors: [],
      renderErrors: [],
      metrics: {},
    });
  });

  it('maps a successful render to a results[0].screenshots[0] PngScreenshotResult for png calls', async () => {
    mockRenderPage.mockReturnValue(
      Rx.of({
        data: Buffer.from('png-bytes'),
        renderErrors: ['1 panel(s) reported a render error'],
      })
    );

    const getScreenshots = createGetScreenshots({
      getServiceUrl,
      logger,
      security,
      getSystemIdentity,
    });
    const result = await firstValueFrom(getScreenshots(pngOptions()));

    expect(result).toEqual({
      metrics: {},
      results: [
        {
          timeRange: null,
          screenshots: [{ data: Buffer.from('png-bytes'), title: null, description: null }],
          renderErrors: ['1 panel(s) reported a render error'],
        },
      ],
    });
  });

  it('rejects expression-based (Canvas) input without calling the render service', async () => {
    const getScreenshots = createGetScreenshots({
      getServiceUrl,
      logger,
      security,
      getSystemIdentity,
    });

    await expect(
      firstValueFrom(getScreenshots({ ...pdfOptions(), expression: 'some canvas expression' }))
    ).rejects.toThrow(/Expression-based \(Canvas\) capture is not supported/);
    expect(mockRenderPage).not.toHaveBeenCalled();
  });

  it('rejects when the service url is not configured, without calling the render service', async () => {
    const getScreenshots = createGetScreenshots({
      getServiceUrl: () => undefined,
      logger,
      security,
      getSystemIdentity,
    });

    await expect(firstValueFrom(getScreenshots(pdfOptions()))).rejects.toThrow(/not configured/);
    expect(mockRenderPage).not.toHaveBeenCalled();
  });

  it('propagates a synchronous payload-build error (e.g. no urls) as an observable error', async () => {
    const getScreenshots = createGetScreenshots({
      getServiceUrl,
      logger,
      security,
      getSystemIdentity,
    });

    await expect(firstValueFrom(getScreenshots(pdfOptions({ urls: [] })))).rejects.toThrow(
      /exactly one URL per report, got 0/
    );
    expect(mockRenderPage).not.toHaveBeenCalled();
  });

  it('propagates a render failure (e.g. exhausted 429 retries) as an observable error', async () => {
    mockRenderPage.mockReturnValue(Rx.throwError(() => new Error('service saturated')));

    const getScreenshots = createGetScreenshots({
      getServiceUrl,
      logger,
      security,
      getSystemIdentity,
    });

    await expect(firstValueFrom(getScreenshots(pdfOptions()))).rejects.toThrow('service saturated');
  });

  it('rejects more than one url without calling the render service', async () => {
    const getScreenshots = createGetScreenshots({
      getServiceUrl,
      logger,
      security,
      getSystemIdentity,
    });

    await expect(
      firstValueFrom(
        getScreenshots(
          pdfOptions({
            urls: [
              ['http://localhost:5601/app/reportingRedirect', {}],
              ['http://localhost:5601/app/reportingRedirect', {}],
            ],
          })
        )
      )
    ).rejects.toThrow(/exactly one URL per report, got 2/);
    expect(mockRenderPage).not.toHaveBeenCalled();
  });

  it('passes the capture base url, dispatcher and task deadline to the render', async () => {
    mockRenderPage.mockReturnValue(Rx.of({ data: Buffer.from('x'), renderErrors: [] }));
    const dispatcher = new Agent();
    const retryAt = new Date('2026-01-01T00:05:00Z');

    const getScreenshots = createGetScreenshots({
      getServiceUrl,
      logger,
      security,
      getSystemIdentity,
      getCaptureBaseUrl: () => 'https://kibana.example.com',
      getDispatcher: () => dispatcher,
    });
    await firstValueFrom(
      getScreenshots(pdfOptions({ taskInstanceFields: { retryAt, startedAt: null } }))
    );

    const [payload, serviceConfig, deadline] = mockRenderPage.mock.calls[0];
    expect(payload.url).toBe('https://kibana.example.com/app/reportingRedirect');
    expect(serviceConfig).toMatchObject({ url: 'http://localhost:3001', dispatcher });
    expect(deadline).toBe(retryAt);
  });

  it('emits a dispatcher failure as an observable error', async () => {
    const getScreenshots = createGetScreenshots({
      getServiceUrl,
      logger,
      security,
      getSystemIdentity,
      getDispatcher: () => {
        throw new Error('ENOENT');
      },
    });

    await expect(firstValueFrom(getScreenshots(pdfOptions()))).rejects.toThrow('ENOENT');
  });

  describe('authenticating to the service', () => {
    it('mints a fresh token per render rather than reusing one', async () => {
      mockRenderPage.mockReturnValue(Rx.of({ data: Buffer.from('x'), renderErrors: [] }));
      const getScreenshots = createGetScreenshots({
        getServiceUrl,
        logger,
        security,
        getSystemIdentity,
      });

      await firstValueFrom(getScreenshots(pdfOptions()));
      const { createToken } = mockRenderPage.mock.calls[0][1];

      await expect(createToken(new AbortController().signal)).resolves.toBe('ephemeral-token');
      await expect(createToken(new AbortController().signal)).resolves.toBe('ephemeral-token');
      expect(systemIdentity.createEphemeralToken).toHaveBeenCalledTimes(2);
    });

    it("forwards the caller's abort signal, so a mint cannot outlive the render", async () => {
      mockRenderPage.mockReturnValue(Rx.of({ data: Buffer.from('x'), renderErrors: [] }));
      const getScreenshots = createGetScreenshots({
        getServiceUrl,
        logger,
        security,
        getSystemIdentity,
      });

      await firstValueFrom(getScreenshots(pdfOptions()));
      const { createToken } = mockRenderPage.mock.calls[0][1];
      const { signal } = new AbortController();
      await createToken(signal);

      expect(systemIdentity.createEphemeralToken).toHaveBeenCalledWith(signal);
    });

    it('fails the render when UIAM is not configured, rather than calling unauthenticated', async () => {
      mockRenderPage.mockReturnValue(Rx.of({ data: Buffer.from('x'), renderErrors: [] }));
      const getScreenshots = createGetScreenshots({
        getServiceUrl,
        logger,
        security,
        getSystemIdentity: () => undefined,
      });

      await firstValueFrom(getScreenshots(pdfOptions()));
      const { createToken } = mockRenderPage.mock.calls[0][1];

      await expect(createToken(new AbortController().signal)).rejects.toThrow(
        /xpack.security.uiam is not configured/
      );
    });
  });
});

describe('diagnose', () => {
  it('explains that there is no local browser', async () => {
    await expect(firstValueFrom(diagnose())).resolves.toMatch(/not available/);
  });
});
