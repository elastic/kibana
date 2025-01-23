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
  private connectorToken: ConnectorToken | null = null;
  private readonly oAuthTokenUrl: string;
  // NOTE:  this `tokenType` here MUST be `access_token` due to the use of
  //        `ConnectorTokenClient.updateOrCreate()` method, which hardcodes the `tokenType`
  private readonly tokenType = 'access_token';
  private generatingNewTokenPromise: Promise<void> | null = null;

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
    now.setSeconds(now.getSeconds() - 5); // Allows for a threshold of -5s before considering the token expired

    const isExpired = token.expiresAt < now.toISOString();

    if (isExpired) {
      this.params.logger.debug(`Cached access token expired at [${token.expiresAt}]`);
    }

    return isExpired;
  }

  private async retrieveOrGenerateNewTokenIfNeeded(
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<void> {
    if (this.generatingNewTokenPromise) {
      return await this.generatingNewTokenPromise;
    }

    this.generatingNewTokenPromise = (async () => {
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

          const logToken = {
            ...this.connectorToken,
            token: '[redacted]',
          };

          logger.debug(() => `using cached access token:\n${JSON.stringify(logToken, null, 2)}`);
        } else {
          logger.debug(`No cached access token found`);
        }
      }

      if (this.connectorToken && !this.isTokenExpired(this.connectorToken)) {
        logger.debug('Cached token is not expired - no need to request a new one');
        return;
      }

      logger.debug(`Requesting a new Microsoft access token for connector id [${connectorId}]]`);

      // FYI: API Docs: https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow#get-a-token
      const { oAuthScope, clientId } = this.params.config;
      const tokenRequestDate = Date.now();
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
          `Successfully created an access token for Microsoft Defend for Endpoint:\n${JSON.stringify(
            {
              ...newToken.data,
              access_token: '[REDACTED]',
            }
          )}`
      );

      await connectorTokenClient.updateOrReplace({
        connectorId,
        tokenRequestDate,
        deleteExisting: true,
        token: this.connectorToken,
        newToken: newToken.data.access_token,
        expiresInSec: newToken.data.expires_in,
      });

      const updatedCachedToken = await connectorTokenClient.get({
        connectorId,
        tokenType: this.tokenType,
      });

      if (!updatedCachedToken.connectorToken) {
        throw new Error(`Failed to retrieve cached [${this.tokenType}] after it was updated.`);
      }

      this.connectorToken = updatedCachedToken.connectorToken;
    })().finally(() => {
      this.generatingNewTokenPromise = null;
    });

    return this.generatingNewTokenPromise;
  }

  /**
   * Returns the Bearer token that should be used in API calls
   */
  public async get(connectorUsageCollector: ConnectorUsageCollector): Promise<string> {
    await this.retrieveOrGenerateNewTokenIfNeeded(connectorUsageCollector);

    if (!this.connectorToken) {
      throw new Error('Access token for Microsoft Defend for Endpoint not available!');
    }

    return this.connectorToken.token;
  }
}
