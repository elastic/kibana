/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosHeaderValue, AxiosInstance } from 'axios';
import axios from 'axios';
import { getOAuthClientCredentialsAccessToken } from '@kbn/actions-plugin/server/lib/get_oauth_client_credentials_access_token';
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
} from '@kbn/connector-schemas/webhook';
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
    logger.error(`Connector ${connectorId}: error parsing additional fields`);
  }

  let accessToken;
  try {
    accessToken = await getOAuthClientCredentialsAccessToken({
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

  const headersWithAuth = {
    ...headers,
    Authorization: accessToken,
  };

  return { axiosInstance, headers: headersWithAuth, sslOverrides: {} };
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

  const mergedHeaders = mergeConfigHeadersWithSecretHeaders(headers, secrets?.secretHeaders);
  const headersWithAuth = combineHeadersWithBasicAuthHeader({
    username: basicAuth.auth?.username,
    password: basicAuth.auth?.password,
    headers: mergedHeaders,
  });

  return { axiosInstance, headers: headersWithAuth, sslOverrides };
};

export interface GetAxiosConfigResponse {
  axiosInstance: AxiosInstance;
  headers: Record<string, AxiosHeaderValue> | undefined;
  sslOverrides: SSLSettings;
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
    } else {
      axiosConfig = await getDefaultAxiosConfig({ config, secrets });
    }

    return [axiosConfig, null];
  } catch (error) {
    return [null, error];
  }
};
