/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { CONNECTOR_TYPE_ICON_MAX_BYTES } from '@kbn/actions-plugin/common';
import type { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { fetchConnectorTypeLogo } from './fetch_logo';

const fetchMock = jest.fn();
const publicLookup = jest.fn().mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);

const configurationUtilities = {
  ensureUriAllowed: jest.fn(),
  getResponseSettings: jest.fn().mockReturnValue({ maxContentLength: 1_000_000, timeout: 5000 }),
} as unknown as jest.Mocked<ActionsConfigurationUtilities>;
const logger = loggingSystemMock.create().get();

const PNG_BYTES = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('rest-of-the-image'),
]);
const SVG_BYTES = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"/>');
const ICO_BYTES = Buffer.from([0, 0, 1, 0, 1, 0, 16, 16]);

const imageResponse = (bytes: Buffer, contentType: string, status = 200) => ({
  status,
  headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? contentType : null) },
  arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length),
});

const fetchLogo = (url = 'https://cdn.example.com/logo.png') =>
  fetchConnectorTypeLogo({
    url,
    configurationUtilities,
    logger,
    lookup: publicLookup,
    fetch: fetchMock,
  });

describe('fetchConnectorTypeLogo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    publicLookup.mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
  });

  it('returns the image as a base64 data URI', async () => {
    fetchMock.mockResolvedValue(imageResponse(PNG_BYTES, 'image/png'));

    await expect(fetchLogo()).resolves.toBe(
      `data:image/png;base64,${PNG_BYTES.toString('base64')}`
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://cdn.example.com/logo.png',
      expect.objectContaining({ redirect: 'manual' })
    );
  });

  it('accepts an SVG and ignores content type parameters', async () => {
    fetchMock.mockResolvedValue(imageResponse(SVG_BYTES, 'image/svg+xml; charset=utf-8'));

    await expect(fetchLogo('https://cdn.example.com/logo.svg')).resolves.toBe(
      `data:image/svg+xml;base64,${SVG_BYTES.toString('base64')}`
    );
  });

  it.each(['image/x-icon', 'image/vnd.microsoft.icon'])('accepts a %s favicon', async (mime) => {
    fetchMock.mockResolvedValue(imageResponse(ICO_BYTES, mime));

    await expect(fetchLogo('https://docs.example.com/favicon.ico')).resolves.toBe(
      `data:${mime};base64,${ICO_BYTES.toString('base64')}`
    );
  });

  it('rejects an image larger than the limit', async () => {
    const tooBig = Buffer.concat([PNG_BYTES, Buffer.alloc(CONNECTOR_TYPE_ICON_MAX_BYTES)]);
    fetchMock.mockResolvedValue(imageResponse(tooBig, 'image/png'));

    await expect(fetchLogo()).rejects.toMatchObject({ reason: 'too_large', statusCode: 400 });
  });

  it('rejects a response that is not an allowed image type', async () => {
    fetchMock.mockResolvedValue(imageResponse(Buffer.from('<html/>'), 'text/html'));

    await expect(fetchLogo()).rejects.toMatchObject({ reason: 'unsupported_content' });
  });

  it('rejects bytes that are not the image type the server declared', async () => {
    fetchMock.mockResolvedValue(imageResponse(Buffer.from('<html>not a png</html>'), 'image/png'));

    await expect(fetchLogo()).rejects.toMatchObject({
      reason: 'unsupported_content',
      message: 'The response is not a valid image/png image.',
    });
  });

  it('rejects an empty body', async () => {
    fetchMock.mockResolvedValue(imageResponse(Buffer.alloc(0), 'image/png'));

    await expect(fetchLogo()).rejects.toMatchObject({ reason: 'unsupported_content' });
  });

  it.each([
    ['127.0.0.1', 'loopback'],
    ['10.0.0.8', 'private'],
    ['169.254.169.254', 'link-local metadata'],
  ])('does not fetch from %s (%s)', async (address) => {
    publicLookup.mockResolvedValue([{ address, family: 4 }]);

    await expect(fetchLogo()).rejects.toMatchObject({ reason: 'blocked_destination' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a non-http scheme without fetching', async () => {
    await expect(fetchLogo('file:///etc/passwd')).rejects.toMatchObject({ reason: 'invalid_url' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('re-checks the destination after a redirect', async () => {
    fetchMock.mockResolvedValueOnce({
      status: 302,
      headers: {
        get: (name: string) => (name === 'location' ? 'http://internal.example.com/x.png' : null),
      },
    });
    publicLookup
      .mockResolvedValueOnce([{ address: '8.8.8.8', family: 4 }])
      .mockResolvedValueOnce([{ address: '10.1.2.3', family: 4 }]);

    await expect(fetchLogo()).rejects.toMatchObject({ reason: 'blocked_destination' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
