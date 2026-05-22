/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosInstance } from 'axios';
import { normalizeAuthorizationHeaderValue, type GetTokenOpts } from '@kbn/connector-specs';
import type { AxiosErrorWithRetry } from '../axios_utils';
import { getEarsAccessToken } from '../ears';
import type { AxiosAuthStrategy, AuthStrategyDeps } from './types';

interface EarsSecrets {
  provider?: string;
}

export class EarsStrategy implements AxiosAuthStrategy {
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
      throw new Error('ConnectorTokenClient is required for EARS authorization code flow');
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

        logger.debug(
          `Attempting EARS token refresh for connectorId ${connectorId} after 401 error`
        );

        const { provider } = secrets as EarsSecrets;
        if (!provider) {
          error.message = 'Authentication failed: Missing required EARS provider.';
          return Promise.reject(error);
        }

        const newAccessToken = await getEarsAccessToken({
          connectorId,
          logger,
          configurationUtilities,
          provider,
          connectorTokenClient,
          authMode,
          profileUid,
          forceRefresh: true,
        });

        if (!newAccessToken) {
          error.message =
            'Authentication failed: Unable to refresh access token via EARS. Please re-authorize the connector.';
          return Promise.reject(error);
        }

        logger.debug(
          `EARS token refreshed successfully for connectorId ${connectorId}. Retrying request.`
        );
        const normalizedAccessToken = normalizeAuthorizationHeaderValue(newAccessToken);
        error.config.headers.Authorization = normalizedAccessToken;
        axiosInstance.defaults.headers.common.Authorization = normalizedAccessToken;
        return axiosInstance.request(error.config);
      }
    );
  }

  async getToken(opts: GetTokenOpts, deps: AuthStrategyDeps): Promise<string | null> {
    if (opts.authType !== 'ears') {
      throw new Error('EarsStrategy received non-ears token opts');
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
      throw new Error('ConnectorTokenClient is required for EARS OAuth flow');
    }

    const { provider } = opts;
    return getEarsAccessToken({
      connectorId,
      logger,
      configurationUtilities,
      provider,
      connectorTokenClient,
      authMode,
      profileUid,
    });
  }
}
