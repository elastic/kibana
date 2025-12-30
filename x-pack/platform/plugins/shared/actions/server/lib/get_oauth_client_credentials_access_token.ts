/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import startCase from 'lodash/startCase';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { ConnectorToken, ConnectorTokenClientContract } from '../types';
import { requestOAuthClientCredentialsToken } from './request_oauth_client_credentials_token';

export interface GetOAuthClientCredentialsConfig {
  clientId: string;
  additionalFields?: Record<string, unknown>;
}

export interface GetOAuthClientCredentialsSecrets {
  clientSecret: string;
}

interface GetOAuthClientCredentialsAccessTokenOpts {
  connectorId?: string;
  tokenUrl: string;
  oAuthScope?: string;
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
  credentials: {
    config: GetOAuthClientCredentialsConfig;
    secrets: GetOAuthClientCredentialsSecrets;
  };
  connectorTokenClient?: ConnectorTokenClientContract;
}

export const getOAuthClientCredentialsAccessToken = async ({
  connectorId,
  logger,
  tokenUrl,
  oAuthScope,
  configurationUtilities,
  credentials,
  connectorTokenClient,
}: GetOAuthClientCredentialsAccessTokenOpts) => {
  const { clientId, additionalFields } = credentials.config;
  const { clientSecret } = credentials.secrets;

  if (!clientId || !clientSecret) {
    logger.warn(`Missing required fields for requesting OAuth Client Credentials access token`);
    return null;
  }

  let accessToken: string;
  let connectorToken: ConnectorToken | null = null;
  let hasErrors = false;

  if (connectorId && connectorTokenClient) {
    // Check if there is a token stored for this connector
    const { connectorToken: token, hasErrors: errors } = await connectorTokenClient.get({
      connectorId,
    });
    connectorToken = token;
    hasErrors = errors;
  }

  if (
    connectorToken === null ||
    (connectorToken.expiresAt ? Date.parse(connectorToken.expiresAt) <= Date.now() : false)
  ) {
    // Save the time before requesting token so we can use it to calculate expiration
    const requestTokenStart = Date.now();

    const tokenResult = await requestOAuthClientCredentialsToken(
      tokenUrl,
      logger,
      {
        scope: oAuthScope,
        clientId,
        clientSecret,
        ...additionalFields,
      },
      configurationUtilities
    );
    // Some providers return "bearer" instead of "Bearer", but expect "Bearer" in the header,
    // so we normalize the token type, i.e., capitalize first letter (e.g., "bearer" -> "Bearer")
    const normalizedTokenType = startCase(tokenResult.tokenType);
    accessToken = `${normalizedTokenType} ${tokenResult.accessToken}`;

    // try to update connector_token SO
    if (connectorId && connectorTokenClient) {
      try {
        await connectorTokenClient.updateOrReplace({
          connectorId,
          token: connectorToken,
          newToken: accessToken,
          tokenRequestDate: requestTokenStart,
          expiresInSec: tokenResult.expiresIn,
          deleteExisting: hasErrors,
        });
      } catch (err) {
        logger.warn(
          `Not able to update connector token for connectorId: ${connectorId} due to error: ${err.message}`
        );
      }
    }
  } else {
    // use existing valid token
    accessToken = connectorToken.token;
  }
  return accessToken;
};
