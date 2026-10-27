/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, firstValueFrom, of } from 'rxjs';
import { coreMock } from '@kbn/core/server/mocks';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type { PdfScreenshotOptions } from '@kbn/screenshotting-plugin/server';
import type { PluginConfig } from './config';
import { PageRenderScreenshottingPlugin } from './plugin';
import { renderPage } from './render/client';

jest.mock('./render/client');

const mockRenderPage = renderPage as jest.MockedFunction<typeof renderPage>;

const baseConfig: PluginConfig = {
  enabled: true,
  url: 'http://localhost:3001',
  ssl: { verificationMode: 'full' },
};

const pdfOptions: PdfScreenshotOptions = {
  format: 'pdf',
  browserTimezone: 'UTC',
  layout: { id: 'print' },
  urls: [['http://localhost:5601/app/reportingRedirect', {}]],
  taskInstanceFields: { retryAt: null, startedAt: null },
};

const createSecurityStart = (withSystemIdentity: boolean) =>
  ({
    authc: {
      systemIdentity: withSystemIdentity
        ? { createEphemeralToken: jest.fn(async () => 'token') }
        : undefined,
    },
  } as unknown as SecurityPluginStart);

const setupPlugin = (
  config: PluginConfig,
  {
    withSystemIdentity = true,
    publicBaseUrl,
  }: { withSystemIdentity?: boolean; publicBaseUrl?: string } = {}
) => {
  const config$ = new BehaviorSubject(config);
  const context = coreMock.createPluginInitializerContext(config);
  context.config.create.mockReturnValue(config$);

  const plugin = new PageRenderScreenshottingPlugin(context);
  const coreStartMock = coreMock.createStart();
  const coreStart = {
    ...coreStartMock,
    http: {
      ...coreStartMock.http,
      basePath: { ...coreStartMock.http.basePath, publicBaseUrl },
    },
  };
  plugin.setup(coreMock.createSetup());
  const start = plugin.start(coreStart, { security: createSecurityStart(withSystemIdentity) });

  return { start, config$, logger: context.logger.get() };
};

describe('PageRenderScreenshottingPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRenderPage.mockReturnValue(of({ data: Buffer.from('x'), renderErrors: [] }));
  });

  it('provides the full screenshotting contract', async () => {
    const { start } = setupPlugin(baseConfig);

    await expect(firstValueFrom(start.diagnose())).resolves.toMatch(/not available/);
    expect(start.getScreenshots).toEqual(expect.any(Function));
  });

  it('picks up a dynamically updated kibanaBaseUrl without a restart', async () => {
    const { start, config$ } = setupPlugin({
      ...baseConfig,
      kibanaBaseUrl: 'https://first.example.com',
    });

    await firstValueFrom(start.getScreenshots(pdfOptions));
    config$.next({ ...baseConfig, kibanaBaseUrl: 'https://second.example.com' });
    await firstValueFrom(start.getScreenshots(pdfOptions));

    expect(mockRenderPage.mock.calls[0][0].url).toBe(
      'https://first.example.com/app/reportingRedirect'
    );
    expect(mockRenderPage.mock.calls[1][0].url).toBe(
      'https://second.example.com/app/reportingRedirect'
    );
  });

  it('falls back to server.publicBaseUrl when kibanaBaseUrl is unset', async () => {
    const { start } = setupPlugin(baseConfig, { publicBaseUrl: 'https://public.example.com' });
    await firstValueFrom(start.getScreenshots(pdfOptions));

    expect(mockRenderPage.mock.calls[0][0].url).toBe(
      'https://public.example.com/app/reportingRedirect'
    );
  });

  it('warns at startup when it is enabled but cannot work', () => {
    const { logger } = setupPlugin(
      { ...baseConfig, url: undefined },
      { withSystemIdentity: false }
    );

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('.url is not set'));
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Neither xpack.pageRenderScreenshotting.kibanaBaseUrl')
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('xpack.security.uiam is not configured')
    );
  });

  it('does not warn when disabled', () => {
    const { logger } = setupPlugin(
      { ...baseConfig, enabled: false, url: undefined },
      { withSystemIdentity: false }
    );

    expect(logger.warn).not.toHaveBeenCalled();
  });
});
