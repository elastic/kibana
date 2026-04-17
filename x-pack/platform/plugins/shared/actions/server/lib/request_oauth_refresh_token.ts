/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { OAuthTokenResponse } from './request_oauth_token';
import { requestOAuthToken } from './request_oauth_token';
import type { AsApiContract } from '../../common';

export const OAUTH_REFRESH_TOKEN_GRANT_TYPE = 'refresh_token';

export interface RefreshTokenOAuthRequestParams {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  scope?: string;
  [key: string]: unknown;
}

const rewriteBodyRequest = (params: RefreshTokenOAuthRequestParams) => {
  const { refreshToken, clientId, clientSecret, ...rest } = params;
  return {
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    ...rest,
  } as AsApiContract<RefreshTokenOAuthRequestParams>;
};

export async function requestOAuthRefreshToken(
  tokenUrl: string,
  logger: Logger,
  params: RefreshTokenOAuthRequestParams,
  configurationUtilities: ActionsConfigurationUtilities,
  useBasicAuth: boolean = true // Default to true (OAuth 2.0 recommended practice)
): Promise<OAuthTokenResponse> {
  return await requestOAuthToken<RefreshTokenOAuthRequestParams>(
    tokenUrl,
    OAUTH_REFRESH_TOKEN_GRANT_TYPE,
    configurationUtilities,
    logger,
    rewriteBodyRequest(params),
    useBasicAuth
  );
}
