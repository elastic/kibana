/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Logger } from '@kbn/core/server';
import { ActionsConfigurationUtilities } from '../actions_config';
import { ConnectorToken, ConnectorTokenClientContract } from '../types';
import { createJWTAssertion } from './create_jwt_assertion';
import { requestOAuthJWTToken } from './request_oauth_jwt_token';

export interface GetOAuthJwtConfig {
  clientId: string;
  jwtKeyId: string;
  userIdentifierValue: string;
}

export interface GetOAuthJwtSecrets {
  clientSecret: string;
  privateKey: string;
  privateKeyPassword: string | null;
}

interface GetOAuthJwtAccessTokenOpts {
  connectorId?: string;
  tokenUrl: string;
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
  credentials: {
    config: GetOAuthJwtConfig;
    secrets: GetOAuthJwtSecrets;
  };
  connectorTokenClient?: ConnectorTokenClientContract;
}

export const getOAuthJwtAccessToken = async ({
  connectorId,
  logger,
  tokenUrl,
  configurationUtilities,
  credentials,
  connectorTokenClient,
}: GetOAuthJwtAccessTokenOpts) => {
  const { clientId, jwtKeyId, userIdentifierValue } = credentials.config;
  const { clientSecret, privateKey, privateKeyPassword } = credentials.secrets;

  if (!clientId || !clientSecret || !jwtKeyId || !privateKey || !userIdentifierValue) {
    logger.warn(`Missing required fields for requesting OAuth JWT access token`);
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
    // generate a new assertion
    const assertion = createJWTAssertion(logger, privateKey, privateKeyPassword, {
      audience: clientId,
      issuer: clientId,
      subject: userIdentifierValue,
      keyId: jwtKeyId,
    });

    // Save the time before requesting token so we can use it to calculate expiration
    const requestTokenStart = Date.now();

    // request access token with jwt assertion
    const tokenResult = await requestOAuthJWTToken(
      tokenUrl,
      {
        clientId,
        clientSecret,
        assertion,
      },
      logger,
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
