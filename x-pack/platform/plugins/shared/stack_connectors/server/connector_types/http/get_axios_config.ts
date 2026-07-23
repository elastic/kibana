/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosHeaderValue, AxiosInstance } from 'axios';
import axios from 'axios';
import { getOAuthClientCredentialsAccessToken } from '@kbn/actions-plugin/server/lib/get_oauth_client_credentials_access_token';
import { getOAuthPasswordAccessToken } from '@kbn/actions-plugin/server/lib/get_oauth_password_access_token';
import {
  combineHeadersWithBasicAuthHeader,
  getDeleteTokenAxiosInterceptor,
  mergeConfigHeadersWithSecretHeaders,
} from '@kbn/actions-plugin/server/lib';
import type { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import type { Logger } from '@kbn/logging/src/logger';
import type { SSLSettings } from '@kbn/actions-utils';
import type { Services } from '@kbn/actions-plugin/server/types';
import type {
  ConnectorTypeConfigType,
  ConnectorTypeSecretsType,
} from '@kbn/connector-schemas/http';
import { AuthType } from '@kbn/connector-schemas/common/auth';
import { buildConnectorAuth } from '../../../common/auth/utils';

interface GetOAuth2AxiosConfigParams {
  connectorId: string;
  config: ConnectorTypeConfigType;
  secrets: ConnectorTypeSecretsType;
  services: Services;
  configurationUtilities: ActionsConfigurationUtilities;
  logger: Logger;
}

interface BuildOAuthAxiosConfigParams {
  connectorId: string;
  headers: ConnectorTypeConfigType['headers'];
  secretQueryParams: ConnectorTypeSecretsType['secretQueryParams'];
  connectorTokenClient: Services['connectorTokenClient'];
  logger: Logger;
  getAccessToken: () => Promise<string | null | undefined>;
}

// Shared by all OAuth2 grant types: retrieves the access token, then wires up
// the axios instance/interceptor and headers the same way regardless of grant.
const buildOAuthAxiosConfig = async ({
  connectorId,
  headers,
  secretQueryParams,
  connectorTokenClient,
  logger,
  getAccessToken,
}: BuildOAuthAxiosConfigParams) => {
  let accessToken;
  try {
    accessToken = await getAccessToken();
  } catch (error) {
    throw new Error(`Unable to retrieve/refresh the access token: ${error.message}`);
  }

  if (!accessToken) {
    throw new Error(`Unable to retrieve new access token`);
  }
  logger.debug(`Successfully retrieved access token`);

  const { onFulfilled, onRejected } = getDeleteTokenAxiosInterceptor({
    connectorTokenClient,
    connectorId,
  });
  const axiosInstance = axios.create();
  axiosInstance.interceptors.response.use(onFulfilled, onRejected);

  return {
    axiosInstance,
    headers: { ...headers, Authorization: accessToken },
    sslOverrides: {},
    secretQueryParams: secretQueryParams ?? null,
  };
};

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
  let parsedAdditionalFields: Record<string, unknown> | undefined;
  try {
    parsedAdditionalFields = additionalFields ? JSON.parse(additionalFields) : undefined;
  } catch (error) {
    logger.error(`Connector ${connectorId}: error parsing additional fields`);
  }

  return buildOAuthAxiosConfig({
    connectorId,
    headers,
    secretQueryParams: secrets.secretQueryParams,
    connectorTokenClient,
    logger,
    getAccessToken: () =>
      getOAuthClientCredentialsAccessToken({
        connectorId,
        logger,
        configurationUtilities,
        oAuthScope: scope,
        credentials: {
          type: 'client_secret',
          secrets: { clientSecret: clientSecret! },
          config: {
            clientId: clientId!,
            ...(parsedAdditionalFields ? { additionalFields: parsedAdditionalFields } : {}),
          },
        },
        tokenUrl: accessTokenUrl!,
        connectorTokenClient,
      }),
  });
};

const getOAuthPasswordAxiosConfig = async ({
  connectorId,
  config,
  secrets,
  services: { connectorTokenClient },
  logger,
  configurationUtilities,
}: GetOAuth2AxiosConfigParams) => {
  const { accessTokenUrl, headers } = config;
  const { user, password } = secrets;

  return buildOAuthAxiosConfig({
    connectorId,
    headers,
    secretQueryParams: secrets.secretQueryParams,
    connectorTokenClient,
    logger,
    getAccessToken: () =>
      getOAuthPasswordAccessToken({
        connectorId,
        logger,
        configurationUtilities,
        username: user!,
        password: password!,
        tokenUrl: accessTokenUrl!,
        connectorTokenClient,
      }),
  });
};

interface GetDefaultAxiosConfig {
  config: ConnectorTypeConfigType;
  secrets: ConnectorTypeSecretsType;
}
const getDefaultAxiosConfig = async ({ config, secrets }: GetDefaultAxiosConfig) => {
  const { hasAuth, authType, verificationMode, ca, headers } = config;

  const axiosInstance = axios.create();
  const { basicAuth, sslOverrides } = buildConnectorAuth({
    hasAuth,
    authType,
    secrets,
    verificationMode,
    ca,
  });

  const mergedHeaders = mergeConfigHeadersWithSecretHeaders(headers, secrets.secretHeaders);
  const headersWithAuth = combineHeadersWithBasicAuthHeader({
    username: basicAuth.auth?.username,
    password: basicAuth.auth?.password,
    headers: mergedHeaders,
  });

  return {
    axiosInstance,
    headers: headersWithAuth,
    sslOverrides,
    secretQueryParams: secrets.secretQueryParams ?? null,
  };
};

export interface GetAxiosConfigResponse {
  axiosInstance: AxiosInstance;
  headers: Record<string, AxiosHeaderValue> | undefined;
  sslOverrides: SSLSettings;
  secretQueryParams: Record<string, string> | null;
}

export interface GetAxiosConfigParams {
  config: ConnectorTypeConfigType;
  secrets: ConnectorTypeSecretsType;
  connectorId: string;
  logger: Logger;
  services: Services;
  configurationUtilities: ActionsConfigurationUtilities;
}
export const getAxiosConfig = async ({
  config,
  secrets,
  connectorId,
  services,
  configurationUtilities,
  logger,
}: GetAxiosConfigParams): Promise<[GetAxiosConfigResponse, null] | [null, Error]> => {
  let axiosConfig: GetAxiosConfigResponse;

  try {
    if (config.authType === AuthType.OAuth2ClientCredentials) {
      axiosConfig = await getOAuth2AxiosConfig({
        connectorId,
        logger,
        configurationUtilities,
        services,
        config,
        secrets,
      });
    } else if (config.authType === AuthType.OAuth2Password) {
      axiosConfig = await getOAuthPasswordAxiosConfig({
        connectorId,
        logger,
        configurationUtilities,
        services,
        config,
        secrets,
      });
    } else {
      axiosConfig = await getDefaultAxiosConfig({ config, secrets });
    }

    return [axiosConfig, null];
  } catch (error) {
    return [null, error];
  }
};
