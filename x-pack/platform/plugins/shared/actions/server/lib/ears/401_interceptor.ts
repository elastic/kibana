/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/logging';
import type { AxiosInstance } from 'axios';
import type { AuthMode } from '@kbn/connector-specs';
import type { AxiosErrorWithRetry } from '../axios_utils';
import type { ActionsConfigurationUtilities } from '../../actions_config';
import type { ConnectorTokenClientContract } from '../../types';
import { getEarsAccessToken } from './get_ears_access_token';
import { resolveEarsUrl } from './url';

export interface EarsParams {
  provider?: string;
  tokenUrl?: string;
}
export async function handleEars401Error({
  error,
  connectorId,
  secrets,
  connectorTokenClient,
  logger,
  configurationUtilities,
  axiosInstance,
  authMode,
  profileUid,
}: {
  error: AxiosErrorWithRetry;
  connectorId: string;
  secrets: EarsParams;
  connectorTokenClient: ConnectorTokenClientContract;
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
  axiosInstance: AxiosInstance;
  authMode?: AuthMode;
  profileUid?: string;
}): Promise<AxiosInstance> {
  if (error.config._retry) {
    return Promise.reject(error);
  }

  error.config._retry = true;
  logger.debug(`Attempting EARS token refresh for connectorId ${connectorId} after 401 error`);

  const { provider, tokenUrl: rawTokenUrl } = secrets;
  const derivedTokenPath = provider ? `/${provider}/oauth/token` : rawTokenUrl;
  if (!derivedTokenPath) {
    error.message =
      'Authentication failed: Missing required EARS configuration (provider or tokenUrl).';
    return Promise.reject(error);
  }

  const tokenUrl = resolveEarsUrl(derivedTokenPath, configurationUtilities.getEarsUrl());
  const newAccessToken = await getEarsAccessToken({
    connectorId,
    logger,
    configurationUtilities,
    tokenUrl,
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

  error.config.headers.Authorization = newAccessToken;
  return axiosInstance.request(error.config);
}
