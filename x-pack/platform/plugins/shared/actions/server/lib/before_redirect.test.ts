/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { actionsConfigMock } from '../actions_config.mock';
import { recordConnectorRedirect } from './connector_metrics';
import { getBeforeRedirectFn } from './before_redirect';

jest.mock('./connector_metrics');

const responseDetails = { headers: {}, statusCode: 302 };

const credentialHeaders = {
  Authorization: 'Bearer confidential-value',
  'Api-Key': 'confidential-value',
  'X-Routing-Key': 'confidential-value',
  'X-Custom-Secret': 'confidential-value',
  Cookie: 'session=confidential-value',
};

const safeHeaders = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'Content-Length': '12',
  'User-Agent': 'Kibana/9.6.0',
};

const redirect = (
  fn: ReturnType<typeof getBeforeRedirectFn>,
  fromUrl: string,
  toUrl: string
): Record<string, string> => {
  const { hostname } = new URL(toUrl);
  const headers: Record<string, string> = { ...credentialHeaders, ...safeHeaders };
  fn({ hostname, href: toUrl, headers }, responseDetails, {
    headers: {},
    method: 'GET',
    url: fromUrl,
  });
  return headers;
};

describe('getBeforeRedirectFn', () => {
  let logger: jest.Mocked<Logger>;
  let configurationUtilities: ReturnType<typeof actionsConfigMock.create>;
  let beforeRedirect: ReturnType<typeof getBeforeRedirectFn>;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggingSystemMock.createLogger();
    configurationUtilities = actionsConfigMock.create();
    beforeRedirect = getBeforeRedirectFn(configurationUtilities, logger);
  });

  test('checks the redirect hostname against the allowed hosts', () => {
    configurationUtilities.ensureHostnameAllowed.mockImplementationOnce(() => {
      throw new Error('not allowed');
    });

    expect(() =>
      redirect(beforeRedirect, 'https://api.example.com/a', 'https://evil.example.org/b')
    ).toThrow('not allowed');
    expect(configurationUtilities.ensureHostnameAllowed).toHaveBeenCalledWith('evil.example.org');
  });

  test('throws when the hostname is missing or not a string', () => {
    expect(() =>
      beforeRedirect({}, responseDetails, { headers: {}, method: 'GET', url: '' })
    ).toThrow('redirect hostname not provided by axios');
    expect(() =>
      beforeRedirect({ hostname: 1 }, responseDetails, { headers: {}, method: 'GET', url: '' })
    ).toThrow('redirect hostname provided by axios was not a string');
  });

  test('keeps all headers on a same-origin redirect', () => {
    const headers = redirect(
      beforeRedirect,
      'https://api.example.com/a',
      'https://api.example.com/b'
    );

    expect(headers).toEqual({ ...credentialHeaders, ...safeHeaders });
    expect(logger.debug).not.toHaveBeenCalled();
  });

  test('keeps all headers when upgrading from http to https on the same host', () => {
    const headers = redirect(
      beforeRedirect,
      'http://api.example.com/a',
      'https://api.example.com/a'
    );

    expect(headers).toEqual({ ...credentialHeaders, ...safeHeaders });
  });

  test.each([
    ['another host', 'https://api.example.com/a', 'https://evil.example.org/a'],
    ['a subdomain', 'https://api.example.com/a', 'https://evil.api.example.com/a'],
    ['another port', 'https://api.example.com/a', 'https://api.example.com:8443/a'],
    ['a downgrade to http', 'https://api.example.com/a', 'http://api.example.com/a'],
    [
      'an http to https upgrade on a non-default port',
      'http://api.example.com:8080/a',
      'https://api.example.com:8443/a',
    ],
  ])('keeps only safe headers on a redirect to %s', (_, fromUrl, toUrl) => {
    const headers = redirect(beforeRedirect, fromUrl, toUrl);

    expect(headers).toEqual(safeHeaders);
  });

  test('treats an unparsable previous URL as cross-origin', () => {
    const headers = redirect(beforeRedirect, 'not a url', 'https://api.example.com/a');

    expect(headers).toEqual(safeHeaders);
  });

  test('logs the names of the removed headers, never their values', () => {
    redirect(beforeRedirect, 'https://api.example.com/a', 'https://evil.example.org/a');

    expect(logger.debug).toHaveBeenCalledTimes(1);
    const [message] = logger.debug.mock.calls[0];
    expect(message).toContain('Api-Key');
    expect(message).toContain('evil.example.org');
    expect(message).not.toContain('confidential-value');
  });

  test('records each redirect with the connector type and whether headers were removed', () => {
    const hook = getBeforeRedirectFn(configurationUtilities, logger, '.webhook');

    redirect(hook, 'https://api.example.com/a', 'https://api.example.com/b');
    redirect(hook, 'https://api.example.com/a', 'https://evil.example.org/a');

    expect(recordConnectorRedirect).toHaveBeenNthCalledWith(1, {
      connectorType: '.webhook',
      statusCode: 302,
      crossOrigin: false,
      headersRemoved: false,
    });
    expect(recordConnectorRedirect).toHaveBeenNthCalledWith(2, {
      connectorType: '.webhook',
      statusCode: 302,
      crossOrigin: true,
      headersRemoved: true,
    });
  });

  test('does not record a redirect to a host that is not allowed', () => {
    configurationUtilities.ensureHostnameAllowed.mockImplementationOnce(() => {
      throw new Error('not allowed');
    });

    expect(() =>
      redirect(beforeRedirect, 'https://api.example.com/a', 'https://evil.example.org/b')
    ).toThrow('not allowed');
    expect(recordConnectorRedirect).not.toHaveBeenCalled();
  });
});
