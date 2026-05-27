/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { ConnectorToken, ConnectorTokenClientContract } from '../types';
import { requestOAuthClientCredentialsToken } from './request_oauth_client_credentials_token';

/**
 * Two valid credential modes for the OAuth2 client_credentials grant:
 *
 *  - `client_secret`: classic clientId + clientSecret in the token request
 *    body. May carry extra `additionalFields` to merge into the body.
 *  - `client_assertion`: a signed JWT assertion authenticates the client
 *    instead of a secret. `buildAdditionalFields` is invoked lazily on cache
 *    miss so we don't pay the crypto cost on cached tokens.
 */
export type GetOAuthClientCredentials =
  | {
      type: 'client_secret';
      config: {
        clientId: string;
        additionalFields?: Record<string, unknown>;
      };
      secrets: { clientSecret: string };
    }
  | {
      type: 'client_assertion';
      config: {
        clientId: string;
        buildAdditionalFields: () => Record<string, unknown>;
      };
    };

interface GetOAuthClientCredentialsAccessTokenOpts {
  connectorId?: string;
  tokenUrl: string;
  oAuthScope?: string;
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
  credentials: GetOAuthClientCredentials;
  connectorTokenClient?: ConnectorTokenClientContract;
  tokenEndpointAuthMethod?: 'client_secret_post' | 'client_secret_basic';
}

export const getOAuthClientCredentialsAccessToken = async ({
  connectorId,
  logger,
  tokenUrl,
  oAuthScope,
  configurationUtilities,
  credentials,
  connectorTokenClient,
  tokenEndpointAuthMethod,
}: GetOAuthClientCredentialsAccessTokenOpts) => {
  const { clientId } = credentials.config;
  const hasCredentials =
    credentials.type === 'client_assertion' ||
    (credentials.type === 'client_secret' && !!credentials.secrets.clientSecret);
  if (!clientId || !hasCredentials) {
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

    const body =
      credentials.type === 'client_secret'
        ? {
            scope: oAuthScope,
            clientId,
            clientSecret: credentials.secrets.clientSecret,
            ...credentials.config.additionalFields,
          }
        : {
            scope: oAuthScope,
            clientId,
            ...credentials.config.buildAdditionalFields(),
          };

    const tokenResult = await requestOAuthClientCredentialsToken(
      tokenUrl,
      logger,
      body,
      configurationUtilities,
      tokenEndpointAuthMethod
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
