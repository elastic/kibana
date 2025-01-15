/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceParams, SubActionConnector } from '@kbn/actions-plugin/server';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/usage';
import { ConnectorToken } from '@kbn/actions-plugin/server/types';
import { MicrosoftDefenderEndpointDoNotValidateResponseSchema } from '../../../common/microsoft_defender_endpoint/schema';
import {
  MicrosoftDefenderEndpointConfig,
  MicrosoftDefenderEndpointSecrets,
  MicrosoftDefenderEndpointApiTokenResponse,
} from '../../../common/microsoft_defender_endpoint/types';

export class OAuthTokenManager {
  private accessToken: string = '';
  private connectorToken: ConnectorToken | undefined = undefined;
  private readonly oAuthTokenUrl: string;
  private readonly tokenType = 'access_token';

  constructor(
    private readonly params: ServiceParams<
      MicrosoftDefenderEndpointConfig,
      MicrosoftDefenderEndpointSecrets
    > & {
      apiRequest: SubActionConnector<
        MicrosoftDefenderEndpointConfig,
        MicrosoftDefenderEndpointSecrets
      >['request'];
    }
  ) {
    const url = new URL(params.config.oAuthServerUrl);
    url.pathname = `/${params.config.tenantId}/oauth2/v2.0/token`;
    this.oAuthTokenUrl = url.toString();
  }

  private isTokenExpired(token: ConnectorToken): boolean {
    const now = new Date();
    now.setSeconds(-30); // Allows for a threshold of 30s before considering the token expired

    const isExpired = token.expiresAt < now.toISOString();

    if (isExpired) {
      this.params.logger.debug(`Cached access token expired at [${token.expiresAt}]`);
    }

    return isExpired;
  }

  private async generateNewToken(connectorUsageCollector: ConnectorUsageCollector): Promise<void> {
    const {
      connector: { id: connectorId },
      logger,
    } = this.params;
    const connectorTokenClient = this.params.services.connectorTokenClient;

    if (!this.connectorToken) {
      logger.debug(`Retrieving cached connector access token (if any)`);

      const cachedToken = await connectorTokenClient.get({
        connectorId,
        tokenType: this.tokenType,
      });

      if (cachedToken.connectorToken) {
        this.connectorToken = cachedToken.connectorToken;
      }
    }

    if (this.connectorToken && !this.isTokenExpired(this.connectorToken)) {
      // If current token is not expires, then there is nothing else to do
      return;
    }

    logger.debug(`Requesting a new Microsoft access token for connector id [${connectorId}]]`);

    // FYI: API Docs: https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow#get-a-token
    const { oAuthScope, clientId } = this.params.config;
    const newToken = await this.params.apiRequest<MicrosoftDefenderEndpointApiTokenResponse>(
      {
        url: this.oAuthTokenUrl,
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data: {
          grant_type: 'client_credentials',
          client_id: clientId,
          scope: oAuthScope,
          client_secret: this.params.secrets.clientSecret,
        },
        responseSchema: MicrosoftDefenderEndpointDoNotValidateResponseSchema,
      },
      connectorUsageCollector
    );

    logger.debug(
      () =>
        `Successfully created an access token for Microsoft Defend for Endpoint:\n${JSON.stringify({
          ...newToken.data,
          access_token: '[REDACTED]',
        })}`
    );

    this.accessToken = newToken.data.access_token;
  }

  /**
   * Returns the Bearer token that should be used in API calls
   */
  public async get(connectorUsageCollector: ConnectorUsageCollector): Promise<string> {
    if (!this.accessToken) {
      await this.generateNewToken(connectorUsageCollector);
    }

    if (!this.accessToken) {
      throw new Error('Access token for Microsoft Defend for Endpoint not available!');
    }

    return this.accessToken;
  }
}
