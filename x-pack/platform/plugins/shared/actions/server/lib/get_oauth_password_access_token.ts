/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { ConnectorToken, ConnectorTokenClientContract } from '../types';
import { requestOAuthPasswordToken } from './request_oauth_password_token';

interface GetOAuthPasswordAccessTokenOpts {
  connectorId?: string;
  tokenUrl: string;
  username: string;
  password: string;
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
  connectorTokenClient?: ConnectorTokenClientContract;
}

export const getOAuthPasswordAccessToken = async ({
  connectorId,
  logger,
  tokenUrl,
  username,
  password,
  configurationUtilities,
  connectorTokenClient,
}: GetOAuthPasswordAccessTokenOpts) => {
  if (!username || !password) {
    logger.warn(`Missing required fields for requesting OAuth Password Grant access token`);
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

    const tokenResult = await requestOAuthPasswordToken(
      tokenUrl,
      logger,
      { username, password },
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
