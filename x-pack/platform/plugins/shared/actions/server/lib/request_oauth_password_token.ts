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

export const OAUTH_PASSWORD_GRANT_TYPE = 'password';

export interface PasswordOAuthRequestParams {
  username: string;
  password: string;
  clientId?: string;
  scope?: string;
  usernameField?: 'username' | 'email';
  requestBodyFormat?: 'form' | 'json';
  tokenType?: string;
}

export async function requestOAuthPasswordToken(
  tokenUrl: string,
  logger: Logger,
  params: PasswordOAuthRequestParams,
  configurationUtilities: ActionsConfigurationUtilities
): Promise<OAuthTokenResponse> {
  const {
    username,
    password,
    clientId,
    scope,
    usernameField = 'username',
    requestBodyFormat,
    tokenType,
  } = params;
  return await requestOAuthToken<Record<string, string>>(
    tokenUrl,
    OAUTH_PASSWORD_GRANT_TYPE,
    configurationUtilities,
    logger,
    {
      [usernameField]: username,
      password,
      ...(clientId ? { client_id: clientId } : {}),
      ...(scope ? { scope } : {}),
    },
    false,
    { bodyFormat: requestBodyFormat, tokenType }
  );
}
