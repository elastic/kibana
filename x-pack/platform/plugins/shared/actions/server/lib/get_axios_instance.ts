/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosHeaderValue, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';
import startCase from 'lodash/startCase';
import type { Logger } from '@kbn/core/server';
import type { GetTokenOpts } from '@kbn/connector-specs';
import type { ActionInfo } from './action_executor';
import type { AuthTypeRegistry } from '../auth_types';
import { getCustomAgents } from './get_custom_agents';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { ConnectorTokenClientContract } from '../types';
import { getBeforeRedirectFn } from './before_redirect';
import { getOAuthClientCredentialsAccessToken } from './get_oauth_client_credentials_access_token';
import { getOAuthAuthorizationCodeAccessToken } from './get_oauth_authorization_code_access_token';
import { getDeleteTokenAxiosInterceptor } from './delete_token_axios_interceptor';
import { requestOAuthRefreshToken } from './request_oauth_refresh_token';

export type ConnectorInfo = Omit<ActionInfo, 'rawAction'>;

interface GetAxiosInstanceOpts {
  authTypeRegistry: AuthTypeRegistry;
  configurationUtilities: ActionsConfigurationUtilities;
  logger: Logger;
}

type ValidatedSecrets = Record<string, unknown>;

interface AxiosErrorWithRetry {
  config: InternalAxiosRequestConfig & { _retry?: boolean };
  response?: { status: number };
  message: string;
}

interface OAuth2RefreshParams {
  clientId?: string;
  clientSecret?: string;
  tokenUrl?: string;
  scope?: string;
  useBasicAuth?: boolean;
}

async function handleOAuth401Error({
  error,
  connectorId,
  secrets,
  connectorTokenClient,
  logger,
  configurationUtilities,
  axiosInstance,
}: {
  error: AxiosErrorWithRetry;
  connectorId: string;
  secrets: OAuth2RefreshParams;
  connectorTokenClient: ConnectorTokenClientContract;
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
  axiosInstance: AxiosInstance;
}): Promise<never | AxiosInstance> {
  // Prevent retry loops - only attempt refresh once per request
  if (error.config._retry) {
    return Promise.reject(error);
  }

  error.config._retry = true;
  logger.debug(`Attempting token refresh for connectorId ${connectorId} after 401 error`);

  try {
    // Fetch current token to get refresh token
    const { connectorToken, hasErrors } = await connectorTokenClient.get({
      connectorId,
      tokenType: 'access_token',
    });
    if (hasErrors || !connectorToken?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const { clientId, clientSecret, tokenUrl, scope, useBasicAuth } = secrets;
    if (!clientId || !clientSecret || !tokenUrl) {
      throw new Error('Missing required OAuth configuration (clientId, clientSecret, tokenUrl)');
    }

    // Request new access token using refresh token
    const tokenResult = await requestOAuthRefreshToken(
      tokenUrl,
      logger,
      {
        refreshToken: connectorToken.refreshToken,
        clientId,
        clientSecret,
        scope,
      },
      configurationUtilities,
      useBasicAuth ?? true
    );

    // Update stored token
    const normalizedTokenType = startCase(tokenResult.tokenType);
    const newAccessToken = `${normalizedTokenType} ${tokenResult.accessToken}`;
    await connectorTokenClient.updateWithRefreshToken({
      id: connectorToken.id!,
      token: newAccessToken,
      refreshToken: tokenResult.refreshToken || connectorToken.refreshToken,
      expiresIn: tokenResult.expiresIn,
      refreshTokenExpiresIn: tokenResult.refreshTokenExpiresIn,
      tokenType: 'access_token',
    });

    logger.debug(`Token refreshed successfully for connectorId ${connectorId}. Retrying request.`);

    // Update request with the new token and retry
    error.config.headers.Authorization = newAccessToken;
    return axiosInstance.request(error.config);
  } catch (refreshError) {
    const errorMessage =
      refreshError instanceof Error ? refreshError.message : String(refreshError);
    logger.error(`Token refresh failed for connectorId ${connectorId}: ${errorMessage}`);

    error.message =
      'Authentication failed: Unable to refresh access token. Please re-authorize the connector.';
    return Promise.reject(error);
  }
}

export interface GetAxiosInstanceWithAuthFnOpts {
  additionalHeaders?: Record<string, AxiosHeaderValue>;
  connectorId: string;
  connectorTokenClient?: ConnectorTokenClientContract;
  secrets: ValidatedSecrets;
}
export type GetAxiosInstanceWithAuthFn = (
  opts: GetAxiosInstanceWithAuthFnOpts
) => Promise<AxiosInstance>;
export const getAxiosInstanceWithAuth = ({
  authTypeRegistry,
  configurationUtilities,
  logger,
}: GetAxiosInstanceOpts): GetAxiosInstanceWithAuthFn => {
  return async ({
    additionalHeaders,
    connectorId,
    secrets,
    connectorTokenClient,
  }: GetAxiosInstanceWithAuthFnOpts) => {
    let authTypeId: string | undefined;
    try {
      authTypeId = (secrets as { authType?: string }).authType || 'none';

      // throws if auth type is not found
      const authType = authTypeRegistry.get(authTypeId);

      const { maxContentLength, timeout: settingsTimeout } =
        configurationUtilities.getResponseSettings();

      const axiosInstance = axios.create({
        maxContentLength,
        // should we allow a way for a connector type to specify a timeout override?
        timeout: settingsTimeout,
        beforeRedirect: getBeforeRedirectFn(configurationUtilities),
      });

      // add any additional headers that should be included in every request
      if (additionalHeaders) {
        Object.keys(additionalHeaders).forEach((key) => {
          axiosInstance.defaults.headers.common[key] = additionalHeaders[key];
        });
      }

      // create a request interceptor to inject custom http/https agents based on the URL
      axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
        if (config.url) {
          const { httpAgent, httpsAgent } = getCustomAgents(
            configurationUtilities,
            logger,
            config.url
          );

          // use httpAgent and httpsAgent and set axios proxy: false, to be able to handle fail on invalid certs
          config.httpAgent = httpAgent;
          config.httpsAgent = httpsAgent;
          config.proxy = false;
        }
        return config;
      });

      // add a response interceptor to clean up saved tokens if necessary
      if (connectorTokenClient) {
        const { onFulfilled, onRejected } = getDeleteTokenAxiosInterceptor({
          connectorTokenClient,
          connectorId,
        });
        axiosInstance.interceptors.response.use(onFulfilled, onRejected);
      }

      // Add a response interceptor to handle 401 errors for OAuth authz code grant connectors
      if (authTypeId === 'oauth_authorization_code' && connectorTokenClient) {
        axiosInstance.interceptors.response.use(
          (response) => response,
          (error) => {
            if (error.response?.status === 401) {
              return handleOAuth401Error({
                error,
                connectorId,
                secrets: secrets as OAuth2RefreshParams,
                connectorTokenClient,
                logger,
                configurationUtilities,
                axiosInstance,
              });
            }
            return Promise.reject(error);
          }
        );
      }

      const configureCtx = {
        getCustomHostSettings: (url: string) => configurationUtilities.getCustomHostSettings(url),
        getToken: async (opts: GetTokenOpts) => {
          // Use different token retrieval method based on auth type
          if (authTypeId === 'oauth_authorization_code') {
            // For authorization code flow, retrieve stored tokens from callback
            if (!connectorTokenClient) {
              throw new Error('ConnectorTokenClient is required for OAuth authorization code flow');
            }
            return await getOAuthAuthorizationCodeAccessToken({
              connectorId,
              logger,
              configurationUtilities,
              credentials: {
                config: {
                  clientId: opts.clientId,
                  tokenUrl: opts.tokenUrl,
                  ...(opts.additionalFields ? { additionalFields: opts.additionalFields } : {}),
                },
                secrets: {
                  clientSecret: opts.clientSecret,
                },
              },
              connectorTokenClient,
              scope: opts.scope,
            });
          }

          // For client credentials flow, request new token each time
          return await getOAuthClientCredentialsAccessToken({
            connectorId,
            logger,
            tokenUrl: opts.tokenUrl,
            oAuthScope: opts.scope,
            configurationUtilities,
            credentials: {
              config: {
                clientId: opts.clientId,
                ...(opts.additionalFields ? { additionalFields: opts.additionalFields } : {}),
              },
              secrets: {
                clientSecret: opts.clientSecret,
              },
            },
            connectorTokenClient,
          });
        },
        logger,
        proxySettings: configurationUtilities.getProxySettings(),
        sslSettings: configurationUtilities.getSSLSettings(),
      };

      // use the registered auth type to configure authentication for the axios instance
      return await authType.configure(configureCtx, axiosInstance, secrets);
    } catch (err) {
      logger.error(
        `Error getting configured axios instance configured for auth type "${
          authTypeId ?? 'unknown'
        }": ${err.message} `
      );
      throw err;
    }
  };
};
