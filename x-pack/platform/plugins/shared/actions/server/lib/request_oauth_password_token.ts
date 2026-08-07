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
}

export async function requestOAuthPasswordToken(
  tokenUrl: string,
  logger: Logger,
  params: PasswordOAuthRequestParams,
  configurationUtilities: ActionsConfigurationUtilities
): Promise<OAuthTokenResponse> {
  return await requestOAuthToken<PasswordOAuthRequestParams>(
    tokenUrl,
    OAUTH_PASSWORD_GRANT_TYPE,
    configurationUtilities,
    logger,
    params
  );
}
