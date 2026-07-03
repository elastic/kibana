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

export const toClientLogoPayload = (clientLogo: ClientLogo): OAuthClientLogo | undefined => {
  if (clientLogo.type === 'none') {
    return undefined;
  }
  const parsed = parseDataUrl(clientLogo.dataUrl);
  if (!parsed || !isOAuthClientLogoMediaType(parsed.mediaType) || parsed.data === '') {
    return undefined;
  }
  return { media_type: parsed.mediaType, data: parsed.data };
};

export const toCreateOAuthClientPayload = ({
  clientName,
  clientLogo,
  redirect,
  isConfidential,
}: McpClientFormData): CreateOAuthClientPayload => {
  return {
    client_name: clientName,
    client_logo: toClientLogoPayload(clientLogo),
    redirect_uris: redirect.uris.map(({ value }) => value),
    client_type: isConfidential ? OAuthClientType.CONFIDENTIAL : OAuthClientType.PUBLIC,
  };
};
