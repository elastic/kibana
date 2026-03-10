/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosInstance } from 'axios';
import type { GetTokenOpts, OAuthGetTokenOpts } from '@kbn/connector-specs';
import { getOAuthClientCredentialsAccessToken } from '../get_oauth_client_credentials_access_token';
import { getDeleteTokenAxiosInterceptor } from '../delete_token_axios_interceptor';
import type { AxiosAuthStrategy, AuthStrategyDeps } from './types';

export class DefaultStrategy implements AxiosAuthStrategy {
  installResponseInterceptor(axiosInstance: AxiosInstance, deps: AuthStrategyDeps): void {
    const { connectorId, connectorTokenClient } = deps;
    const { onFulfilled, onRejected } = getDeleteTokenAxiosInterceptor({
      connectorTokenClient: connectorTokenClient!,
      connectorId,
    });
    axiosInstance.interceptors.response.use(onFulfilled, onRejected);
  }

  async getToken(opts: GetTokenOpts, deps: AuthStrategyDeps): Promise<string | null> {
    const { connectorId, connectorTokenClient, logger, configurationUtilities } = deps;
    const oauthOpts = opts as OAuthGetTokenOpts;
    return getOAuthClientCredentialsAccessToken({
      connectorId,
      logger,
      tokenUrl: oauthOpts.tokenUrl,
      oAuthScope: oauthOpts.scope,
      configurationUtilities,
      credentials: {
        config: {
          clientId: oauthOpts.clientId,
          ...(oauthOpts.additionalFields ? { additionalFields: oauthOpts.additionalFields } : {}),
        },
        secrets: { clientSecret: oauthOpts.clientSecret },
      },
      connectorTokenClient,
    });
  }
}
