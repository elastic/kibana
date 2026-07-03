/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OAuthClientType } from '@kbn/agent-builder-common';
import { toClientLogoPayload, toCreateOAuthClientPayload } from './mcp_client_transform';
import type { ClientLogo, McpClientFormData } from './types';
import { RedirectUriType } from './types';

const PNG_DATA = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB';
const JPEG_DATA = '/9j/4AAQSkZJRgABAQEASABIAAD/';
const GIF_DATA = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAA';

describe('toClientLogoPayload', () => {
  it('returns undefined when the logo type is "none"', () => {
    const logo: ClientLogo = { type: 'none' };

    expect(toClientLogoPayload(logo)).toBeUndefined();
  });

  it('returns the parsed payload for a selected logo with a supported media type', () => {
    const logo: ClientLogo = {
      type: 'select',
      id: 'logo-1',
      dataUrl: `data:image/png;base64,${PNG_DATA}`,
    };

    expect(toClientLogoPayload(logo)).toEqual({
      media_type: 'image/png',
      data: PNG_DATA,
    });
  });

  it('returns the parsed payload for an uploaded logo with a supported media type', () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'logo.jpg', { type: 'image/jpeg' });
    const logo: ClientLogo = {
      type: 'upload',
      file,
      dataUrl: `data:image/jpeg;base64,${JPEG_DATA}`,
    };

    expect(toClientLogoPayload(logo)).toEqual({
      media_type: 'image/jpeg',
      data: JPEG_DATA,
    });
  });

  it.each(['image/png', 'image/jpeg', 'image/gif'] as const)(
    'accepts the supported media type "%s"',
    (mediaType) => {
      const logo: ClientLogo = {
        type: 'select',
        id: 'logo-1',
        dataUrl: `data:${mediaType};base64,${PNG_DATA}`,
      };

      expect(toClientLogoPayload(logo)).toEqual({
        media_type: mediaType,
        data: PNG_DATA,
      });
    }
  );

  it('returns undefined when the data URL cannot be parsed', () => {
    const logo: ClientLogo = {
      type: 'select',
      id: 'logo-1',
      dataUrl: 'not-a-data-url',
    };

    expect(toClientLogoPayload(logo)).toBeUndefined();
  });

  it('returns undefined when the data URL is not base64-encoded', () => {
    const logo: ClientLogo = {
      type: 'select',
      id: 'logo-1',
      dataUrl: 'data:image/png,plain-text-payload',
    };

    expect(toClientLogoPayload(logo)).toBeUndefined();
  });

  it('returns undefined when the media type is not a supported logo type', () => {
    const logo: ClientLogo = {
      type: 'select',
      id: 'logo-1',
      dataUrl: `data:image/svg+xml;base64,${PNG_DATA}`,
    };

    expect(toClientLogoPayload(logo)).toBeUndefined();
  });

  it('returns undefined when the base64 payload is empty', () => {
    const logo: ClientLogo = {
      type: 'select',
      id: 'logo-1',
      dataUrl: 'data:image/gif;base64,',
    };

    expect(toClientLogoPayload(logo)).toBeUndefined();
  });
});

describe('toCreateOAuthClientPayload', () => {
  const baseFormData: McpClientFormData = {
    clientName: 'My MCP Client',
    clientLogo: { type: 'none' },
    redirect: {
      type: RedirectUriType.LOCAL,
      uris: [{ value: 'http://127.0.0.1:3000/callback' }],
    },
    isConfidential: false,
  };

  it('builds a payload for a public client with no logo and a single redirect URI', () => {
    expect(toCreateOAuthClientPayload(baseFormData)).toEqual({
      client_name: 'My MCP Client',
      client_logo: undefined,
      redirect_uris: ['http://127.0.0.1:3000/callback'],
      client_type: OAuthClientType.PUBLIC,
    });
  });

  it('builds a payload for a confidential client', () => {
    const payload = toCreateOAuthClientPayload({
      ...baseFormData,
      isConfidential: true,
    });

    expect(payload.client_type).toBe(OAuthClientType.CONFIDENTIAL);
  });

  it('includes a parsed client_logo when a valid logo is provided', () => {
    const payload = toCreateOAuthClientPayload({
      ...baseFormData,
      clientLogo: {
        type: 'select',
        id: 'logo-1',
        dataUrl: `data:image/gif;base64,${GIF_DATA}`,
      },
    });

    expect(payload.client_logo).toEqual({
      media_type: 'image/gif',
      data: GIF_DATA,
    });
  });

  it('omits client_logo when the logo fails validation', () => {
    const payload = toCreateOAuthClientPayload({
      ...baseFormData,
      clientLogo: {
        type: 'select',
        id: 'logo-1',
        dataUrl: 'data:image/svg+xml;base64,invalid-for-logos',
      },
    });

    expect(payload.client_logo).toBeUndefined();
  });

  it('maps remote redirect URIs to the redirect_uris array', () => {
    const payload = toCreateOAuthClientPayload({
      ...baseFormData,
      redirect: {
        type: RedirectUriType.REMOTE,
        uris: [{ value: 'https://example.com/callback' }],
      },
    });

    expect(payload.redirect_uris).toEqual(['https://example.com/callback']);
  });
});
