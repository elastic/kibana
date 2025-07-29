/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { getOAuthClientCredentialsAccessToken } from '@kbn/actions-plugin/server/lib/get_oauth_client_credentials_access_token';
import { combineHeadersWithBasicAuthHeader } from '@kbn/actions-plugin/server/lib';
import type { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import type { Logger } from '@kbn/logging/src/logger';
import type { Services } from '@kbn/actions-plugin/server/types';
import { getOauth2DeleteTokenAxiosInterceptor } from '../../../common/auth/oauth2_delete_token_axios_interceptor';
import { buildConnectorAuth } from '../../../common/auth/utils';
import { AuthType } from '../../../common/auth/constants';
import type { ConnectorTypeConfigType, ConnectorTypeSecretsType } from './types';

interface GetOAuth2AxiosConfigParams {
  connectorId: string;
  config: ConnectorTypeConfigType;
  secrets: ConnectorTypeSecretsType;
  services: Services;
  configurationUtilities: ActionsConfigurationUtilities;
  logger: Logger;
}
const getOAuth2AxiosConfig = async ({
  connectorId,
  config,
  secrets,
  services: { connectorTokenClient },
  logger,
  configurationUtilities,
}: GetOAuth2AxiosConfigParams) => {
  const { accessTokenUrl, clientId, scope, additionalFields, headers } = config;
  const { clientSecret } = secrets;

  // `additionalFields` should be parseable, we do check API schema validation and in
  // action config validation step.
  let parsedAdditionalFields;
  try {
    parsedAdditionalFields = additionalFields ? JSON.parse(additionalFields) : undefined;
  } catch (error) {
    logger.error(`Error parsing additional fields for connectorId: "${connectorId}"`);
  }

  const accessToken = await getOAuthClientCredentialsAccessToken({
    connectorId,
    logger,
    configurationUtilities,
    oAuthScope: scope,
    credentials: {
      secrets: { clientSecret: clientSecret! },
      config: {
        clientId: clientId!,
        ...(parsedAdditionalFields ? { additionalFields: parsedAdditionalFields } : {}),
      },
    },
    tokenUrl: accessTokenUrl!,
    connectorTokenClient,
  });

  if (!accessToken) {
    throw new Error(`Unable to retrieve new access token for connectorId: ${connectorId}`);
  }
  logger.debug(`Successfully retrieved access token for connectorId: "${connectorId}"`);

  const { onFulfilled, onRejected } = getOauth2DeleteTokenAxiosInterceptor({
    connectorTokenClient,
    connectorId,
  });
  const axiosInstance = axios.create();
  axiosInstance.interceptors.response.use(onFulfilled, onRejected);

  const headersWithAuth = {
    ...headers,
    'Content-Type': 'application/json',
    Authorization: accessToken,
  };

  return { axiosInstance, headers: headersWithAuth, sslOverrides: {} };
};

interface GetDefaultAxiosConfig {
  config: ConnectorTypeConfigType;
  secrets: ConnectorTypeSecretsType;
  headers: Record<string, string> | null;
}
const getDefaultAxiosConfig = ({ config, secrets, headers }: GetDefaultAxiosConfig) => {
  const { hasAuth, authType, verificationMode, ca } = config;

  const axiosInstance = axios.create();
  const { basicAuth, sslOverrides } = buildConnectorAuth({
    hasAuth,
    authType,
    secrets,
    verificationMode,
    ca,
  });

  const headersWithAuth = combineHeadersWithBasicAuthHeader({
    username: basicAuth.auth?.username,
    password: basicAuth.auth?.password,
    headers,
  });

  return { axiosInstance, headers: headersWithAuth, sslOverrides };
};

export interface GetAxiosConfigParams {
  config: ConnectorTypeConfigType;
  secrets: ConnectorTypeSecretsType;
  connectorId: string;
  logger: Logger;
  services: Services;
  configurationUtilities: ActionsConfigurationUtilities;
}
export const getAxiosConfig = ({
  config,
  secrets,
  connectorId,
  services,
  configurationUtilities,
  logger,
}: GetAxiosConfigParams) => {
  if (config.authType === AuthType.OAuth2ClientCredentials) {
    return getOAuth2AxiosConfig({
      connectorId,
      logger,
      configurationUtilities,
      services,
      config,
      secrets,
    });
  }
  return getDefaultAxiosConfig({ config, secrets, headers: config.headers });
};
