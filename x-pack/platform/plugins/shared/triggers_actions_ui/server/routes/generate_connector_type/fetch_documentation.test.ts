/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { extractText, fetchDocumentation } from './fetch_documentation';

const fetchMock = jest.fn();

const publicLookup = jest.fn().mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);

const lookupReturning = (address: string) =>
  jest.fn().mockResolvedValue([{ address, family: address.includes(':') ? 6 : 4 }]);

const configurationUtilities = {
  ensureUriAllowed: jest.fn(),
  getResponseSettings: jest.fn().mockReturnValue({ maxContentLength: 1000, timeout: 5000 }),
} as unknown as jest.Mocked<ActionsConfigurationUtilities>;

const logger = loggingSystemMock.create().get();

const httpResponse = (
  body: string,
  init: { status?: number; headers?: Record<string, string> } = {}
) => ({
  status: init.status ?? 200,
  headers: {
    get: (name: string) => init.headers?.[name.toLowerCase()] ?? null,
  },
  text: async () => body,
});

const fetchOpts = (overrides: Record<string, unknown> = {}) =>
  ({
    url: 'https://docs.example.com/api',
    configurationUtilities,
    logger,
    lookup: publicLookup,
    fetch: fetchMock,
    ...overrides,
  } as Parameters<typeof fetchDocumentation>[0]);

beforeEach(() => {
  jest.clearAllMocks();
  configurationUtilities.getResponseSettings.mockReturnValue({
    maxContentLength: 1000,
    timeout: 5000,
  });
  publicLookup.mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
});

describe('fetchDocumentation', () => {
  it('rejects a non-http scheme', async () => {
    await expect(
      fetchDocumentation(fetchOpts({ url: 'ftp://example.com/file' }))
    ).rejects.toMatchObject({ reason: 'invalid_url', statusCode: 400 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['10.0.0.8', 'private IPv4'],
    ['127.0.0.1', 'loopback IPv4'],
    ['169.254.169.254', 'link-local IPv4'],
    ['::1', 'loopback IPv6'],
    ['fd00::1', 'IPv6 unique local'],
  ])('rejects %s (%s) from the injected lookup', async (address) => {
    await expect(
      fetchDocumentation(fetchOpts({ lookup: lookupReturning(address) }))
    ).rejects.toMatchObject({ reason: 'blocked_destination', statusCode: 400 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['http://localhost/docs', 'http://api.localhost/docs', 'http://LOCALHOST/docs'])(
    'rejects %s',
    async (url) => {
      await expect(fetchDocumentation(fetchOpts({ url }))).rejects.toMatchObject({
        reason: 'blocked_destination',
      });
      expect(fetchMock).not.toHaveBeenCalled();
    }
  );

  it('calls ensureUriAllowed for the URL and each redirect target', async () => {
    fetchMock
      .mockResolvedValueOnce(
        httpResponse('', { status: 302, headers: { location: 'https://docs.example.com/next' } })
      )
      .mockResolvedValueOnce(httpResponse('hello', { headers: { 'content-type': 'text/plain' } }));

    const document = await fetchDocumentation(fetchOpts({ url: 'https://example.com/start' }));

    expect(configurationUtilities.ensureUriAllowed).toHaveBeenCalledWith(
      'https://example.com/start'
    );
    expect(configurationUtilities.ensureUriAllowed).toHaveBeenCalledWith(
      'https://docs.example.com/next'
    );
    expect(document).toEqual({
      url: 'https://docs.example.com/next',
      contentType: 'text/plain',
      text: 'hello',
    });
  });

  it('stops after max redirects', async () => {
    fetchMock.mockResolvedValue(
      httpResponse('', { status: 302, headers: { location: 'https://example.com/again' } })
    );

    await expect(fetchDocumentation(fetchOpts({ maxRedirects: 0 }))).rejects.toMatchObject({
      reason: 'fetch_failed',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects a disallowed content type', async () => {
    fetchMock.mockResolvedValue(
      httpResponse('%PDF', { headers: { 'content-type': 'application/pdf' } })
    );

    await expect(fetchDocumentation(fetchOpts())).rejects.toMatchObject({
      reason: 'unsupported_content',
    });
  });

  it('maps a maxContentLength error to too_large', async () => {
    fetchMock.mockRejectedValue(new Error('maxContentLength size of 1000 exceeded'));

    await expect(fetchDocumentation(fetchOpts())).rejects.toMatchObject({
      reason: 'too_large',
      statusCode: 400,
    });
  });

  it('rejects a body larger than maxContentLength', async () => {
    fetchMock.mockResolvedValue(
      httpResponse('x'.repeat(1001), { headers: { 'content-type': 'text/plain' } })
    );

    await expect(fetchDocumentation(fetchOpts())).rejects.toMatchObject({
      reason: 'too_large',
      statusCode: 400,
    });
  });

  it('follows redirects manually and applies the response timeout', async () => {
    fetchMock.mockResolvedValue(
      httpResponse('docs', { headers: { 'content-type': 'text/plain; charset=utf-8' } })
    );

    await fetchDocumentation(fetchOpts());

    expect(fetchMock).toHaveBeenCalledWith(
      'https://docs.example.com/api',
      expect.objectContaining({
        method: 'GET',
        redirect: 'manual',
        signal: expect.any(AbortSignal),
        dispatcher: expect.anything(),
      })
    );
    expect(configurationUtilities.getResponseSettings).toHaveBeenCalled();
  });
});

describe('extractText', () => {
  it('strips scripts and nav and collapses whitespace', () => {
    const text = extractText({
      contentType: 'text/html; charset=utf-8',
      body: '<html><head><style>x</style></head><body><nav>Menu</nav><script>alert(1)</script><p>Hello   world</p><footer>Foot</footer></body></html>',
    });

    expect(text).toBe('Hello world');
  });

  it('passes JSON and plain text through', () => {
    expect(extractText({ contentType: 'application/json', body: '{ "a": 1 }' })).toBe('{ "a": 1 }');
    expect(extractText({ contentType: 'text/plain', body: 'line 1\nline 2' })).toBe(
      'line 1\nline 2'
    );
    expect(extractText({ contentType: 'text/markdown', body: '# Title' })).toBe('# Title');
  });
});
