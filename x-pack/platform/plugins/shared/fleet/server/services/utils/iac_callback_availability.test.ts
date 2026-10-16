/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import type { RequestListener } from 'http';
import https from 'https';
import type { AddressInfo } from 'net';

import { CA_CERT_PATH, KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
import { loggerMock } from '@kbn/logging-mocks';

import { appContextService } from '../app_context';

import {
  clearIacCallbackAvailabilityCache,
  getIacCallbackAvailability,
  probeIacCallbackUrl,
} from './iac_callback_availability';

jest.mock('../app_context');

const mockedAppContext = jest.mocked(appContextService);

// The dev certificate chains to the dev CA, which no public root vouches for.
const DEV_CA = readFileSync(CA_CERT_PATH, 'utf8');
const serverOptions = {
  cert: readFileSync(KBN_CERT_PATH, 'utf8'),
  key: readFileSync(KBN_KEY_PATH, 'utf8'),
};

const listen = (
  handler: RequestListener = (_request, response) => {
    response.writeHead(404);
    response.end();
  }
): Promise<{ server: https.Server; url: string }> =>
  new Promise((resolve) => {
    const server = https.createServer(serverOptions, handler);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({ server, url: `https://localhost:${port}` });
    });
  });

const close = (server: https.Server) =>
  new Promise<void>((resolve) => {
    server.closeAllConnections();
    server.close(() => resolve());
  });

const setPublicBaseUrl = (publicBaseUrl: string | undefined) =>
  mockedAppContext.getHttpSetup.mockReturnValue({ basePath: { publicBaseUrl } } as any);

describe('probeIacCallbackUrl', () => {
  let server: https.Server;
  let url: string;

  afterEach(async () => {
    if (server) {
      await close(server);
    }
  });

  it('is a certificate reason when the URL does not chain to a public root, as in a Lambda', async () => {
    ({ server, url } = await listen());

    const reason = await probeIacCallbackUrl(url);

    expect(reason).toContain(
      `The public Kibana URL ${url} presents a TLS certificate that is not publicly trusted`
    );
  });

  it('is reachable when the certificate is trusted, whatever the HTTP status', async () => {
    ({ server, url } = await listen());

    expect(await probeIacCallbackUrl(url, { ca: DEV_CA })).toBeUndefined();
  });

  it('is a reachability reason when nothing answers', async () => {
    ({ server, url } = await listen());
    await close(server);

    const reason = await probeIacCallbackUrl(url, { ca: DEV_CA });

    expect(reason).toContain(`The public Kibana URL ${url} could not be reached (`);
    expect(reason).toContain('ECONNREFUSED');
  });

  it('is a reachability reason when the URL never responds', async () => {
    ({ server, url } = await listen(() => {}));

    const reason = await probeIacCallbackUrl(url, { ca: DEV_CA, timeoutMs: 100 });

    expect(reason).toContain(
      `The public Kibana URL ${url} could not be reached (no response within 100ms)`
    );
  });
});

describe('getIacCallbackAvailability', () => {
  let logger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    jest.clearAllMocks();
    clearIacCallbackAvailabilityCache();
    logger = loggerMock.create();
    mockedAppContext.getLogger.mockReturnValue(logger);
  });

  it('is unavailable without a public URL', async () => {
    setPublicBaseUrl(undefined);

    expect(await getIacCallbackAvailability()).toEqual({
      available: false,
      reason: 'Kibana has no public URL: server.publicBaseUrl is not set.',
    });
  });

  it('is unavailable, without probing, when the public URL is not https', async () => {
    setPublicBaseUrl('http://kibana.example.com/');

    expect(await getIacCallbackAvailability()).toEqual({
      available: false,
      kibanaUrl: 'http://kibana.example.com',
      reason:
        'The public Kibana URL http://kibana.example.com is not https. CloudFormation only accepts an https callback URL.',
    });
  });

  it('is available when the public URL answers with a trusted certificate, and caches that', async () => {
    const { server, url } = await listen();
    setPublicBaseUrl(`${url}/`);

    expect(await getIacCallbackAvailability({ ca: DEV_CA })).toEqual({
      available: true,
      kibanaUrl: url,
    });
    expect(logger.warn).not.toHaveBeenCalled();

    // A cached result is reused even though nothing answers any more.
    await close(server);
    expect(await getIacCallbackAvailability({ ca: DEV_CA })).toEqual({
      available: true,
      kibanaUrl: url,
    });

    clearIacCallbackAvailabilityCache();
    const stale = await getIacCallbackAvailability({ ca: DEV_CA });
    expect(stale.available).toBe(false);
    expect(stale.reason).toContain('could not be reached');
  });

  it('logs a warning with the reason when the public URL cannot be trusted', async () => {
    const { server, url } = await listen();
    setPublicBaseUrl(url);

    const result = await getIacCallbackAvailability();

    expect(result.available).toBe(false);
    expect(result.kibanaUrl).toBe(url);
    expect(result.reason).toContain('is not publicly trusted');
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        `IaC callback unavailable: The public Kibana URL ${url} presents a TLS certificate that is not publicly trusted`
      )
    );
    await close(server);
  });
});
