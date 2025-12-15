/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import { INTERNAL_BASE_ACTION_API_PATH } from '../../constants';

interface OAuthAuthorizeResponse {
  authorizationUrl: string;
  state: string;
}

export async function oauthAuthorize({
  http,
  connectorId,
}: {
  http: HttpSetup;
  connectorId: string;
}): Promise<OAuthAuthorizeResponse> {
  const res = await http.post<OAuthAuthorizeResponse>(
    `${INTERNAL_BASE_ACTION_API_PATH}/connector/${encodeURIComponent(
      connectorId
    )}/_oauth_authorize`,
    {
      body: JSON.stringify({}),
    }
  );
  return res;
}
