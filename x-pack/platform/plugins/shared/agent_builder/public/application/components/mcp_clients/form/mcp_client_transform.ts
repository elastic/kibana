/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OAuthClient, OAuthClientLogo } from '@kbn/agent-builder-common';
import { OAuthClientType } from '@kbn/agent-builder-common';
import { isOAuthClientLogoMediaType } from '@kbn/security-plugin/common/oauth';
import type { ClientLogo, McpClientFormData, RedirectUriConfig } from './types';
import { RedirectUriType } from './types';
import { parseDataUrl } from '../../../utils/data_url';
import type {
  CreateOAuthClientPayload,
  UpdateOAuthClientPayload,
} from '../../../../../common/http_api/oauth_clients';

/**
 * Converts the form's logo selection into the API payload shape.
 *
 * @param clientLogo - The logo variant held in form state.
 * @param fallbackDataUrl - Data URL to persist when no logo was chosen. Callers
 *   pass the default MCP client logo so every client has a mark to display.
 * @returns The logo payload, or `undefined` when there is nothing usable to
 *   send, including when the data URL fails validation.
 */
export const toClientLogoPayload = (
  clientLogo: ClientLogo,
  fallbackDataUrl?: string
): OAuthClientLogo | undefined => {
  const dataUrl = clientLogo.type === 'none' ? fallbackDataUrl : clientLogo.dataUrl;
  if (!dataUrl) {
    return undefined;
  }
  const parsed = parseDataUrl(dataUrl);
  if (!parsed || !isOAuthClientLogoMediaType(parsed.mediaType) || parsed.data === '') {
    return undefined;
  }
  return { media_type: parsed.mediaType, data: parsed.data };
};

/**
 * Builds the create-client request body from the form state.
 *
 * @param formData - Validated MCP client form values.
 * @param fallbackLogoDataUrl - Data URL to persist when no logo was chosen.
 * @returns The payload for the create OAuth client endpoint.
 */
export const toCreateOAuthClientPayload = (
  { clientName, clientLogo, redirect, isConfidential }: McpClientFormData,
  fallbackLogoDataUrl?: string
): CreateOAuthClientPayload => {
  return {
    client_name: clientName,
    client_logo: toClientLogoPayload(clientLogo, fallbackLogoDataUrl),
    redirect_uris: redirect.uris.map(({ value }) => value),
    client_type: isConfidential ? OAuthClientType.CONFIDENTIAL : OAuthClientType.PUBLIC,
  };
};

const toUpdateClientLogoPayload = (clientLogo: ClientLogo): OAuthClientLogo | null | undefined =>
  clientLogo.type === 'none' ? null : toClientLogoPayload(clientLogo);

export const toUpdateOAuthClientPayload = ({
  clientName,
  clientLogo,
  redirect,
}: McpClientFormData): UpdateOAuthClientPayload => {
  return {
    client_name: clientName,
    client_logo: toUpdateClientLogoPayload(clientLogo),
    redirect_uris: redirect.uris.map(({ value }) => value),
  };
};

const isLoopbackUri = (uri: string): boolean => {
  try {
    const { hostname } = new URL(uri);
    return hostname === 'localhost' || hostname === '[::1]' || hostname.startsWith('127.');
  } catch {
    return false;
  }
};

/**
 * Recovers the redirect URI type, which is form-only state that is never
 * persisted, from the stored URIs. Anything the remote variant cannot represent
 * falls back to local, whose schema is the permissive one.
 *
 * @param redirectUris - The client's stored `redirect_uris`.
 * @returns Form state for the redirect section, with a single empty URI when the
 *   client has none stored.
 */
export const deriveRedirectConfig = (redirectUris?: string[]): RedirectUriConfig => {
  const uris = (redirectUris ?? []).filter((uri) => uri !== '');

  if (uris.length === 0) {
    return { type: RedirectUriType.LOCAL, uris: [{ value: '' }] };
  }

  const isRemote = uris.every((uri) => uri.startsWith('https://') && !isLoopbackUri(uri));

  return {
    type: isRemote ? RedirectUriType.REMOTE : RedirectUriType.LOCAL,
    uris: uris.map((value) => ({ value })),
  };
};

/**
 * Builds form state for an existing client.
 *
 * @param client - The client being edited.
 * @param clientLogo - Logo form state, resolved separately because matching a
 *   stored logo back to a preset requires loading the preset assets.
 * @returns Values to seed the form with.
 */
export const oauthClientToFormData = (
  client: OAuthClient,
  clientLogo: ClientLogo
): McpClientFormData => ({
  clientName: client.client_name ?? '',
  clientLogo,
  redirect: deriveRedirectConfig(client.redirect_uris),
  isConfidential: client.type === OAuthClientType.CONFIDENTIAL,
});
