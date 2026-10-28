/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosInstance } from 'axios';
import type { GetTokenOpts } from '@kbn/connector-specs';
import { getOAuthPasswordAccessToken } from '../get_oauth_password_access_token';
import { getDeleteTokenAxiosInterceptor } from '../delete_token_axios_interceptor';
import type { AxiosAuthStrategy, AuthStrategyDeps } from './types';

export class OAuthPasswordStrategy implements AxiosAuthStrategy {
  installResponseInterceptor(client: AxiosInstance, deps: AuthStrategyDeps): void {
    const { connectorId, connectorTokenClient } = deps;
    if (!connectorTokenClient) {
      throw new Error('Failed to delete invalid tokens: missing required ConnectorTokenClient.');
    }
    const { onFulfilled, onRejected } = getDeleteTokenAxiosInterceptor({
      connectorId,
      connectorTokenClient,
    });
    client.interceptors.response.use(onFulfilled, onRejected);
  }

  async getToken(opts: GetTokenOpts, deps: AuthStrategyDeps): Promise<string | null> {
    if (opts.authType !== 'oauth_password') {
      throw new Error('OAuthPasswordStrategy received non-password token opts');
    }
    const { connectorId, connectorTokenClient, logger, configurationUtilities } = deps;
    return getOAuthPasswordAccessToken({
      tokenUrl: opts.tokenUrl,
      username: opts.username,
      password: opts.password,
      clientId: opts.clientId,
      scope: opts.scope,
      usernameField: opts.usernameField,
      requestBodyFormat: opts.requestBodyFormat,
      tokenType: opts.tokenType,
      connectorId,
      connectorTokenClient,
      logger,
      configurationUtilities,
    });
  }
}
