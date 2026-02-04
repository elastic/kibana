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

export const OAUTH_AUTHORIZATION_CODE_GRANT_TYPE = 'authorization_code';

export interface AuthorizationCodeOAuthRequestParams {
  code: string;
  redirectUri: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
  [key: string]: unknown;
}

const rewriteBodyRequest = (params: AuthorizationCodeOAuthRequestParams) => {
  const { code, redirectUri, codeVerifier, clientId, clientSecret, ...rest } = params;
  return {
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
    client_id: clientId,
    client_secret: clientSecret,
    ...rest,
  } as AsApiContract<AuthorizationCodeOAuthRequestParams>;
};

export async function requestOAuthAuthorizationCodeToken(
  tokenUrl: string,
  logger: Logger,
  params: AuthorizationCodeOAuthRequestParams,
  configurationUtilities: ActionsConfigurationUtilities,
  useBasicAuth: boolean = true // Default to true (OAuth 2.0 recommended practice)
): Promise<OAuthTokenResponse> {
  return await requestOAuthToken<AuthorizationCodeOAuthRequestParams>(
    tokenUrl,
    OAUTH_AUTHORIZATION_CODE_GRANT_TYPE,
    configurationUtilities,
    logger,
    rewriteBodyRequest(params),
    useBasicAuth
  );
}
