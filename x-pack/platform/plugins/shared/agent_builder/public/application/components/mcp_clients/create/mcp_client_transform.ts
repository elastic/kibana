/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OAuthClientLogo } from '@kbn/agent-builder-common';
import { OAuthClientType } from '@kbn/agent-builder-common';
import { isOAuthClientLogoMediaType } from '@kbn/security-plugin/common/oauth';
import type { ClientLogo, McpClientFormData } from './types';
import { parseDataUrl } from '../../../utils/data_url';
import type { CreateOAuthClientPayload } from '../../../../../common/http_api/oauth_clients';

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
