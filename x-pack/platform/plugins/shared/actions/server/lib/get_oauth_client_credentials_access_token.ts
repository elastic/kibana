/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Logger } from '@kbn/core/server';
import { ActionsConfigurationUtilities } from '../actions_config';
import { ConnectorToken, ConnectorTokenClientContract } from '../types';
import { requestOAuthClientCredentialsToken } from './request_oauth_client_credentials_token';

export interface GetOAuthClientCredentialsConfig {
  clientId: string;
  tenantId: string;
}

export interface GetOAuthClientCredentialsSecrets {
  clientSecret: string;
}

interface GetOAuthClientCredentialsAccessTokenOpts {
  connectorId?: string;
  tokenUrl: string;
  oAuthScope: string;
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
  const { clientId, tenantId } = credentials.config;
  const { clientSecret } = credentials.secrets;

  if (!clientId || !clientSecret || !tenantId) {
    logger.warn(`Missing required fields for requesting OAuth Client Credentials access token`);
    return null;
  }

  let accessToken: string;
  let connectorToken: ConnectorToken | null = null;
  let hasErrors: boolean = false;

  if (connectorId && connectorTokenClient) {
    // Check if there is a token stored for this connector
    const { connectorToken: token, hasErrors: errors } = await connectorTokenClient.get({
      connectorId,
    });
    connectorToken = token;
    hasErrors = errors;
  }

  if (connectorToken === null || Date.parse(connectorToken.expiresAt) <= Date.now()) {
    // Save the time before requesting token so we can use it to calculate expiration
    const requestTokenStart = Date.now();

    // request access token with jwt assertion
    const tokenResult = await requestOAuthClientCredentialsToken(
      tokenUrl,
      logger,
      {
        scope: oAuthScope,
        clientId,
        clientSecret,
      },
      configurationUtilities
    );
    accessToken = `${tokenResult.tokenType} ${tokenResult.accessToken}`;

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
