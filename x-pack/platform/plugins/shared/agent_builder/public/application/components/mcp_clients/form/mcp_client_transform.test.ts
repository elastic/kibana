/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OAuthClient } from '@kbn/agent-builder-common';
import { OAuthClientType } from '@kbn/agent-builder-common';
import {
  deriveRedirectConfig,
  oauthClientToFormData,
  toClientLogoPayload,
  toCreateOAuthClientPayload,
  toUpdateOAuthClientPayload,
} from './mcp_client_transform';
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

  it('falls back to the provided data URL when the logo type is "none"', () => {
    const logo: ClientLogo = { type: 'none' };

    expect(toClientLogoPayload(logo, `data:image/png;base64,${PNG_DATA}`)).toEqual({
      media_type: 'image/png',
      data: PNG_DATA,
    });
  });

  it('prefers an explicit selection over the fallback data URL', () => {
    const logo: ClientLogo = {
      type: 'select',
      id: 'logo-1',
      dataUrl: `data:image/gif;base64,${GIF_DATA}`,
    };

    expect(toClientLogoPayload(logo, `data:image/png;base64,${PNG_DATA}`)).toEqual({
      media_type: 'image/gif',
      data: GIF_DATA,
    });
  });

  it('returns undefined when the logo type is "none" and the fallback fails validation', () => {
    const logo: ClientLogo = { type: 'none' };

    expect(toClientLogoPayload(logo, 'not-a-data-url')).toBeUndefined();
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

  it('persists the fallback logo when the form carries no selection', () => {
    const payload = toCreateOAuthClientPayload(baseFormData, `data:image/png;base64,${PNG_DATA}`);

    expect(payload.client_logo).toEqual({
      media_type: 'image/png',
      data: PNG_DATA,
    });
  });

  it('ignores the fallback logo when the form carries a selection', () => {
    const payload = toCreateOAuthClientPayload(
      {
        ...baseFormData,
        clientLogo: {
          type: 'select',
          id: 'logo-1',
          dataUrl: `data:image/gif;base64,${GIF_DATA}`,
        },
      },
      `data:image/png;base64,${PNG_DATA}`
    );

    expect(payload.client_logo).toEqual({
      media_type: 'image/gif',
      data: GIF_DATA,
    });
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

describe('toUpdateOAuthClientPayload', () => {
  const baseFormData: McpClientFormData = {
    clientName: 'My MCP Client',
    clientLogo: { type: 'none' },
    redirect: {
      type: RedirectUriType.LOCAL,
      uris: [{ value: 'http://127.0.0.1:3000/callback' }],
    },
    isConfidential: false,
  };

  it('never sends client_type, which is immutable after registration', () => {
    const payload = toUpdateOAuthClientPayload({ ...baseFormData, isConfidential: true });

    expect(payload).not.toHaveProperty('client_type');
  });

  it('sends client_logo as null when the logo was cleared', () => {
    const payload = toUpdateOAuthClientPayload(baseFormData);

    expect(payload.client_logo).toBeNull();
  });

  it('includes a parsed client_logo when a valid logo is provided', () => {
    const payload = toUpdateOAuthClientPayload({
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

  it('omits client_logo when the logo fails validation, leaving the stored logo untouched', () => {
    const payload = toUpdateOAuthClientPayload({
      ...baseFormData,
      clientLogo: {
        type: 'select',
        id: 'logo-1',
        dataUrl: 'data:image/svg+xml;base64,invalid-for-logos',
      },
    });

    expect(payload.client_logo).toBeUndefined();
  });

  it('maps the form name and redirect URIs onto the payload', () => {
    const payload = toUpdateOAuthClientPayload({
      ...baseFormData,
      clientName: 'Renamed client',
      redirect: {
        type: RedirectUriType.LOCAL,
        uris: [{ value: 'http://localhost:3000/cb' }, { value: 'http://127.0.0.1:3000/cb' }],
      },
    });

    expect(payload.client_name).toBe('Renamed client');
    expect(payload.redirect_uris).toEqual(['http://localhost:3000/cb', 'http://127.0.0.1:3000/cb']);
  });
});

describe('deriveRedirectConfig', () => {
  it('falls back to a single empty local URI when the client has none stored', () => {
    expect(deriveRedirectConfig([])).toEqual({
      type: RedirectUriType.LOCAL,
      uris: [{ value: '' }],
    });
    expect(deriveRedirectConfig(undefined)).toEqual({
      type: RedirectUriType.LOCAL,
      uris: [{ value: '' }],
    });
  });

  it.each([
    'http://127.0.0.1:3000/callback',
    'http://localhost:3000/callback',
    'http://[::1]:3000/callback',
    'https://localhost:3000/callback',
  ])('treats the loopback URI "%s" as local', (uri) => {
    expect(deriveRedirectConfig([uri])).toEqual({
      type: RedirectUriType.LOCAL,
      uris: [{ value: uri }],
    });
  });

  it('treats a single non-loopback HTTPS URI as remote', () => {
    expect(deriveRedirectConfig(['https://example.com/callback'])).toEqual({
      type: RedirectUriType.REMOTE,
      uris: [{ value: 'https://example.com/callback' }],
    });
  });

  it('treats multiple non-loopback HTTPS URIs as remote', () => {
    const uris = ['https://example.com/callback', 'https://other.example.com/callback'];

    expect(deriveRedirectConfig(uris)).toEqual({
      type: RedirectUriType.REMOTE,
      uris: uris.map((value) => ({ value })),
    });
  });

  it('treats a mixed HTTP and HTTPS set as local', () => {
    const uris = ['https://example.com/callback', 'http://example.com/callback'];

    expect(deriveRedirectConfig(uris)).toEqual({
      type: RedirectUriType.LOCAL,
      uris: uris.map((value) => ({ value })),
    });
  });

  it('treats a set of loopback HTTPS URIs as local', () => {
    const uris = ['https://localhost:3000/callback', 'https://127.0.0.1:3000/callback'];

    expect(deriveRedirectConfig(uris)).toEqual({
      type: RedirectUriType.LOCAL,
      uris: uris.map((value) => ({ value })),
    });
  });

  it('treats a set with a single loopback HTTPS URI as local', () => {
    const uris = ['https://example.com/callback', 'https://localhost:3000/callback'];

    expect(deriveRedirectConfig(uris)).toEqual({
      type: RedirectUriType.LOCAL,
      uris: uris.map((value) => ({ value })),
    });
  });

  it('ignores empty URIs', () => {
    expect(deriveRedirectConfig(['', 'https://example.com/callback'])).toEqual({
      type: RedirectUriType.REMOTE,
      uris: [{ value: 'https://example.com/callback' }],
    });
  });

  it('treats an unparseable URI as local', () => {
    expect(deriveRedirectConfig(['not a uri'])).toEqual({
      type: RedirectUriType.LOCAL,
      uris: [{ value: 'not a uri' }],
    });
  });
});

describe('oauthClientToFormData', () => {
  const client: OAuthClient = {
    id: 'client-1',
    resource: 'resource-1',
    client_name: 'My MCP Client',
    type: OAuthClientType.CONFIDENTIAL,
    redirect_uris: ['https://example.com/callback'],
  };

  it('maps a stored client onto form values', () => {
    const logo: ClientLogo = {
      type: 'select',
      id: 'logo-1',
      dataUrl: `data:image/png;base64,${PNG_DATA}`,
    };

    expect(oauthClientToFormData(client, logo)).toEqual({
      clientName: 'My MCP Client',
      clientLogo: logo,
      redirect: {
        type: RedirectUriType.REMOTE,
        uris: [{ value: 'https://example.com/callback' }],
      },
      isConfidential: true,
    });
  });

  it('defaults a missing name to an empty string and a missing type to public', () => {
    const formData = oauthClientToFormData(
      { id: 'client-1', resource: 'resource-1' },
      { type: 'none' }
    );

    expect(formData.clientName).toBe('');
    expect(formData.isConfidential).toBe(false);
  });
});
