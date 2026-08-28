/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { loggerMock } from '@kbn/logging-mocks';
import { securityServiceMock } from '@kbn/core-security-server-mocks';
import type { PdfScreenshotOptions, PngScreenshotOptions } from '@kbn/screenshotting-plugin/server';
import { createGetScreenshots } from './get_screenshots';
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
  const config = { enabled: true, url: 'http://localhost:3001', secret: 'shh' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps a successful render to a flat PdfScreenshotResult for pdf calls', async () => {
    mockRenderPage.mockReturnValue(Rx.of({ data: Buffer.from('pdf-bytes'), renderErrors: [] }));

    const getScreenshots = createGetScreenshots({ config, logger, security });
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

    const getScreenshots = createGetScreenshots({ config, logger, security });
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
    const getScreenshots = createGetScreenshots({ config, logger, security });

    await expect(
      firstValueFrom(getScreenshots({ ...pdfOptions(), expression: 'some canvas expression' }))
    ).rejects.toThrow(/does not support expression-based/);
    expect(mockRenderPage).not.toHaveBeenCalled();
  });

  it('rejects when the service url is not configured, without calling the render service', async () => {
    const getScreenshots = createGetScreenshots({
      config: { ...config, url: undefined },
      logger,
      security,
    });

    await expect(firstValueFrom(getScreenshots(pdfOptions()))).rejects.toThrow(/not configured/);
    expect(mockRenderPage).not.toHaveBeenCalled();
  });

  it('propagates a synchronous payload-build error (e.g. no urls) as an observable error', async () => {
    const getScreenshots = createGetScreenshots({ config, logger, security });

    await expect(firstValueFrom(getScreenshots(pdfOptions({ urls: [] })))).rejects.toThrow(
      /no URLs to render/
    );
    expect(mockRenderPage).not.toHaveBeenCalled();
  });

  it('propagates a render failure (e.g. exhausted 429 retries) as an observable error', async () => {
    mockRenderPage.mockReturnValue(Rx.throwError(() => new Error('service saturated')));

    const getScreenshots = createGetScreenshots({ config, logger, security });

    await expect(firstValueFrom(getScreenshots(pdfOptions()))).rejects.toThrow('service saturated');
  });

  it('warns and drops extra urls, still rendering the first', async () => {
    mockRenderPage.mockReturnValue(Rx.of({ data: Buffer.from('pdf-bytes'), renderErrors: [] }));

    const getScreenshots = createGetScreenshots({ config, logger, security });
    await firstValueFrom(
      getScreenshots(
        pdfOptions({
          urls: [
            ['http://localhost:5601/app/reportingRedirect', {}],
            ['http://localhost:5601/app/reportingRedirect', {}],
          ],
        })
      )
    );

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('page-render-service only supports one page per call')
    );
  });
});
