/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosInstance } from 'axios';
import type { GetTokenOpts } from '@kbn/connector-specs';
import type { AxiosErrorWithRetry } from '../axios_utils';
import { getOAuthAuthorizationCodeAccessToken } from '../get_oauth_authorization_code_access_token';
import { buildTokenResponseOptions } from '../request_oauth_token';
import type { AxiosAuthStrategy, AuthStrategyDeps } from './types';

interface OAuthAuthCodeSecrets {
  clientId?: string;
  clientSecret?: string;
  tokenUrl?: string;
  scope?: string;
  useBasicAuth?: boolean;
  accessTokenPath?: string;
  tokenTypePath?: string;
  tokenType?: string;
}

export class OAuthAuthCodeStrategy implements AxiosAuthStrategy {
  installResponseInterceptor(axiosInstance: AxiosInstance, deps: AuthStrategyDeps): void {
    const {
      connectorId,
      secrets,
      connectorTokenClient,
      logger,
      configurationUtilities,
      authMode,
      profileUid,
    } = deps;

    if (!connectorTokenClient) {
      throw new Error('ConnectorTokenClient is required for OAuth authorization code flow');
    }

    axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosErrorWithRetry) => {
        if (error.response?.status !== 401) {
          return Promise.reject(error);
        }

        if (error.config._retry) {
          return Promise.reject(error);
        }
        error.config._retry = true;

        logger.debug(`Attempting token refresh for connectorId ${connectorId} after 401 error`);

        const {
          clientId,
          clientSecret,
          tokenUrl,
          scope,
          useBasicAuth,
          accessTokenPath,
          tokenTypePath,
          tokenType,
        } = secrets as OAuthAuthCodeSecrets;

        if (!clientId || !clientSecret || !tokenUrl) {
          error.message =
            'Authentication failed: Missing required OAuth configuration (clientId, clientSecret, tokenUrl).';
          return Promise.reject(error);
        }

        const newAccessToken = await getOAuthAuthorizationCodeAccessToken({
          connectorId,
          logger,
          configurationUtilities,
          credentials: {
            config: { clientId, tokenUrl, useBasicAuth },
            secrets: { clientSecret },
          },
          connectorTokenClient,
          scope,
          authMode,
          profileUid,
          forceRefresh: true,
          tokenResponseOptions: buildTokenResponseOptions({
            accessTokenPath,
            tokenTypePath,
            tokenType,
          }),
        });

        if (!newAccessToken) {
          error.message =
            'Authentication failed: Unable to refresh access token. Please re-authorize the connector.';
          return Promise.reject(error);
        }

        logger.debug(
          `Token refreshed successfully for connectorId ${connectorId}. Retrying request.`
        );
        error.config.headers.Authorization = newAccessToken;
        axiosInstance.defaults.headers.common.Authorization = newAccessToken;
        return axiosInstance.request(error.config);
      }
    );
  }

  async getToken(opts: GetTokenOpts, deps: AuthStrategyDeps): Promise<string | null> {
    if (opts.authType !== 'oauth') {
      throw new Error('OAuthAuthCodeStrategy received non-oauth token opts');
    }

    const {
      connectorId,
      connectorTokenClient,
      logger,
      configurationUtilities,
      authMode,
      profileUid,
    } = deps;
    if (!connectorTokenClient) {
      throw new Error('ConnectorTokenClient is required for OAuth authorization code flow');
    }

    return getOAuthAuthorizationCodeAccessToken({
      connectorId,
      logger,
      configurationUtilities,
      credentials: {
        config: {
          clientId: opts.clientId,
          tokenUrl: opts.tokenUrl,
          ...(opts.tokenEndpointAuthMethod !== undefined
            ? { useBasicAuth: opts.tokenEndpointAuthMethod !== 'client_secret_post' }
            : {}),
          ...(opts.additionalFields ? { additionalFields: opts.additionalFields } : {}),
        },
        secrets: { clientSecret: opts.clientSecret },
      },
      connectorTokenClient,
      scope: opts.scope,
      authMode,
      profileUid,
      tokenResponseOptions: buildTokenResponseOptions({
        accessTokenPath: opts.accessTokenPath,
        tokenTypePath: opts.tokenTypePath,
        tokenType: opts.tokenType,
      }),
    });
  }
}
