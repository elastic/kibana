/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosHeaderValue, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';
import type { Logger } from '@kbn/core/server';
import type { GetTokenOpts } from '@kbn/connector-specs';
import type { ActionInfo } from './action_executor';
import type { AuthTypeRegistry } from '../auth_types';
import { getCustomAgents } from './get_custom_agents';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { ConnectorTokenClientContract } from '../types';
import { getBeforeRedirectFn } from './before_redirect';
import { getOAuthClientCredentialsAccessToken } from './get_oauth_client_credentials_access_token';
import { getDeleteTokenAxiosInterceptor } from './delete_token_axios_interceptor';

export type ConnectorInfo = Omit<ActionInfo, 'rawAction'>;

interface GetAxiosInstanceOpts {
  authTypeRegistry: AuthTypeRegistry;
  configurationUtilities: ActionsConfigurationUtilities;
  logger: Logger;
}

type ValidatedSecrets = Record<string, unknown>;

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

      const configureCtx = {
        getCustomHostSettings: (url: string) => configurationUtilities.getCustomHostSettings(url),
        getToken: async (opts: GetTokenOpts) => {
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
