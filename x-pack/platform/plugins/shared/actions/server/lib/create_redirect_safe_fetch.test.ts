/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
import { PassThrough } from 'stream';
import { Response } from 'node-fetch';
import type { RequestInit } from 'node-fetch';
import type { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { actionsConfigMock } from '../actions_config.mock';
import { getCustomAgents } from './get_custom_agents';
import { recordConnectorRedirect } from './connector_metrics';
import { createRedirectSafeFetch, RedirectNotAllowedError } from './create_redirect_safe_fetch';

jest.mock('./get_custom_agents');
jest.mock('./connector_metrics');

const redirectTo = (location: string, status = 302): Response =>
  new Response('', { status, headers: { location } });

const credentialHeaders = {
  authorization: 'Bearer confidential-value',
  'api-key': 'confidential-value',
  'x-custom': 'confidential-value',
};

const requestHeaders = {
  ...credentialHeaders,
  'content-type': 'application/json',
  'user-agent': 'OpenAI/JS',
};

describe('createRedirectSafeFetch', () => {
  let logger: jest.Mocked<Logger>;
  let configurationUtilities: ReturnType<typeof actionsConfigMock.create>;
  let fetch: jest.Mock;
  const redirectAgents = { httpAgent: new HttpAgent(), httpsAgent: new HttpsAgent() };
  const originalAgent = new HttpsAgent();

  const setup = (...responses: Response[]) => {
    for (const response of responses) {
      fetch.mockResolvedValueOnce(response);
    }
    fetch.mockResolvedValueOnce(new Response('ok', { status: 200 }));
    return createRedirectSafeFetch({ configurationUtilities, logger, fetch });
  };

  const sentInit = (call: number): RequestInit => fetch.mock.calls[call][1];

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggingSystemMock.createLogger();
    configurationUtilities = actionsConfigMock.create();
    fetch = jest.fn();
    jest.mocked(getCustomAgents).mockReturnValue(redirectAgents);
  });

  test('returns a response that is not a redirect as is', async () => {
    const safeFetch = setup();

    const response = await safeFetch('https://api.example.com/v1', { method: 'POST' });

    expect(await response.text()).toBe('ok');
    expect(fetch).toHaveBeenCalledWith('https://api.example.com/v1', {
      method: 'POST',
      redirect: 'manual',
      signal: expect.any(AbortSignal),
    });
    expect(configurationUtilities.ensureUriAllowed).toHaveBeenCalledWith(
      'https://api.example.com/v1'
    );
  });

  test('accepts a URL object', async () => {
    const safeFetch = setup();

    await safeFetch(new URL('https://api.example.com/v1'));

    expect(fetch.mock.calls[0][0]).toBe('https://api.example.com/v1');
  });

  test('checks every redirect hop against the allowed hosts', async () => {
    configurationUtilities.isHostnameAllowed.mockImplementation(
      (hostname) => hostname !== 'evil.example.org'
    );
    const safeFetch = setup(redirectTo('https://evil.example.org/capture?token=secret'));

    const result = safeFetch('https://api.example.com/v1');

    await expect(result).rejects.toThrow(RedirectNotAllowedError);
    await expect(result).rejects.toThrow(
      'Connector request was redirected to "evil.example.org", which is not added to the Kibana config xpack.actions.allowedHosts'
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test('aborts each redirect hop so its connection closes without reading the body', async () => {
    const redirectBody = new PassThrough();
    const safeFetch = setup(
      new Response(redirectBody, { status: 302, headers: { location: '/v2' } })
    );

    await safeFetch('https://api.example.com/v1');

    expect(sentInit(0).signal?.aborted).toBe(true);
    expect(sentInit(1).signal?.aborted).toBe(false);
    // node-fetch emits the abort on the body; it must not become an unhandled error.
    expect(() =>
      redirectBody.emit('error', new Error('The user aborted a request.'))
    ).not.toThrow();
  });

  test("detaches from the caller's signal once the final body is read", async () => {
    const controller = new AbortController();
    const removeListener = jest.spyOn(controller.signal, 'removeEventListener');
    const body = new PassThrough();
    fetch.mockResolvedValueOnce(new Response(body, { status: 200 }));
    const safeFetch = createRedirectSafeFetch({ configurationUtilities, logger, fetch });

    const response = await safeFetch('https://api.example.com/v1', { signal: controller.signal });
    expect(removeListener).not.toHaveBeenCalled();

    body.end('ok');
    await response.text();

    expect(removeListener).toHaveBeenCalledWith('abort', expect.any(Function));
  });

  test.each([
    ['errors', (body: PassThrough) => body.emit('error', new Error('incorrect header check'))],
    ['closes before it ends', (body: PassThrough) => body.destroy()],
  ])('aborts the final request when its body %s', async (_, endEarly) => {
    const controller = new AbortController();
    const body = new PassThrough();
    body.on('error', () => {});
    fetch.mockResolvedValueOnce(new Response(body, { status: 200 }));
    const safeFetch = createRedirectSafeFetch({ configurationUtilities, logger, fetch });

    await safeFetch('https://api.example.com/v1', { signal: controller.signal });
    endEarly(body);
    await new Promise(setImmediate);

    expect(sentInit(0).signal?.aborted).toBe(true);
  });

  test('does not abort the final request after its body ends cleanly', async () => {
    const body = new PassThrough();
    fetch.mockResolvedValueOnce(new Response(body, { status: 200 }));
    const safeFetch = createRedirectSafeFetch({ configurationUtilities, logger, fetch });

    const response = await safeFetch('https://api.example.com/v1', {
      signal: new AbortController().signal,
    });
    body.end('ok');
    await response.text();
    await new Promise(setImmediate);

    expect(sentInit(0).signal?.aborted).toBe(false);
  });

  test("passes the caller's abort to the request in flight", async () => {
    const controller = new AbortController();
    fetch
      .mockResolvedValueOnce(redirectTo('/v2'))
      .mockResolvedValueOnce(new Response(new PassThrough(), { status: 200 }));
    const safeFetch = createRedirectSafeFetch({ configurationUtilities, logger, fetch });

    await safeFetch('https://api.example.com/v1', { signal: controller.signal });
    controller.abort();

    expect(sentInit(1).signal?.aborted).toBe(true);
  });

  test('keeps all headers, the body and the agent on a same-origin 307 redirect', async () => {
    const safeFetch = setup(redirectTo('/v2', 307));

    await safeFetch('https://api.example.com/v1', {
      method: 'POST',
      body: '{"a":1}',
      headers: requestHeaders,
      agent: originalAgent,
    });

    expect(fetch.mock.calls[1][0]).toBe('https://api.example.com/v2');
    expect(sentInit(1)).toMatchObject({
      method: 'POST',
      body: '{"a":1}',
      headers: requestHeaders,
      agent: originalAgent,
    });
    expect(getCustomAgents).not.toHaveBeenCalled();
  });

  test('keeps only safe headers and the body on a cross-origin 307 redirect', async () => {
    const safeFetch = setup(redirectTo('https://evil.example.org/capture', 307));

    await safeFetch('https://api.example.com/v1', {
      method: 'POST',
      body: '{"a":1}',
      headers: requestHeaders,
      agent: originalAgent,
    });

    expect(sentInit(1)).toMatchObject({
      method: 'POST',
      body: '{"a":1}',
      headers: { 'content-type': 'application/json', 'user-agent': 'OpenAI/JS' },
      agent: redirectAgents.httpsAgent,
    });
    expect(sentInit(1).headers).not.toHaveProperty('api-key');
    expect(getCustomAgents).toHaveBeenCalledWith(
      configurationUtilities,
      logger,
      'https://evil.example.org/capture'
    );
  });

  test('drops credentials on a redirect to a subdomain', async () => {
    const safeFetch = setup(redirectTo('https://evil.api.example.com/v1'));

    await safeFetch('https://api.example.com/v1', { headers: requestHeaders });

    expect(sentInit(1).headers).toEqual({
      'content-type': 'application/json',
      'user-agent': 'OpenAI/JS',
    });
  });

  test('keeps headers but switches the agent on an http to https upgrade', async () => {
    const safeFetch = setup(redirectTo('https://api.example.com/v1', 301));

    await safeFetch('http://api.example.com/v1', {
      headers: requestHeaders,
      agent: new HttpAgent(),
    });

    expect(sentInit(1).headers).toEqual(requestHeaders);
    expect(sentInit(1).agent).toBe(redirectAgents.httpsAgent);
  });

  test.each([
    [303, 'PUT'],
    [302, 'POST'],
    [301, 'POST'],
  ])('switches to GET without a body on a %s redirect of a %s', async (status, method) => {
    const safeFetch = setup(redirectTo('/result', status));

    await safeFetch('https://api.example.com/v1', {
      method,
      body: '{"a":1}',
      headers: requestHeaders,
    });

    expect(sentInit(1).method).toBe('GET');
    expect(sentInit(1)).not.toHaveProperty('body');
    expect(sentInit(1).headers).not.toHaveProperty('content-type');
    expect(sentInit(1).headers).toHaveProperty('api-key');
  });

  test('refuses to resend a streamed body', async () => {
    const safeFetch = setup(redirectTo('/v2', 307));

    await expect(
      safeFetch('https://api.example.com/v1', { method: 'POST', body: new PassThrough() })
    ).rejects.toThrow('Cannot resend a streamed request body after a 307 redirect');
  });

  test('stops after 20 redirects', async () => {
    fetch.mockImplementation(async () => redirectTo('https://api.example.com/loop'));
    const safeFetch = createRedirectSafeFetch({ configurationUtilities, logger, fetch });

    await expect(safeFetch('https://api.example.com/v1')).rejects.toThrow(
      'Maximum number of redirects (20) exceeded'
    );
    expect(fetch).toHaveBeenCalledTimes(21);
  });

  test('logs the names of the removed headers, never their values', async () => {
    const safeFetch = setup(redirectTo('https://evil.example.org/capture'));

    await safeFetch('https://api.example.com/v1', { headers: requestHeaders });

    const [message] = logger.debug.mock.calls[0];
    expect(message).toContain('api-key');
    expect(message).toContain('evil.example.org');
    expect(message).not.toContain('confidential-value');
  });

  test('records each redirect with the connector type and whether headers were removed', async () => {
    fetch
      .mockResolvedValueOnce(redirectTo('/v2', 308))
      .mockResolvedValueOnce(redirectTo('https://evil.example.org/capture', 307))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));
    const safeFetch = createRedirectSafeFetch({
      configurationUtilities,
      logger,
      connectorType: '.gen-ai',
      fetch,
    });

    await safeFetch('https://api.example.com/v1', { headers: requestHeaders });

    expect(recordConnectorRedirect).toHaveBeenNthCalledWith(1, {
      connectorType: '.gen-ai',
      statusCode: 308,
      crossOrigin: false,
      headersRemoved: false,
    });
    expect(recordConnectorRedirect).toHaveBeenNthCalledWith(2, {
      connectorType: '.gen-ai',
      statusCode: 307,
      crossOrigin: true,
      headersRemoved: true,
    });
  });
});
