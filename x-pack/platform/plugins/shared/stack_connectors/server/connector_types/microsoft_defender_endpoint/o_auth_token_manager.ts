/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceParams, SubActionConnector } from '@kbn/actions-plugin/server';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/usage';
import { ConnectorToken } from '@kbn/actions-plugin/server/types';
import type { Logger } from '@kbn/logging';
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
  private reGenerateNewTokenPromise: Promise<void> | null = null;
  protected logger: Logger;

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
    this.logger = params.logger.get('microsoftDefenderOAuthTokenManager');
    const url = new URL(params.config.oAuthServerUrl);
    url.pathname = `/${params.config.tenantId}/oauth2/v2.0/token`;
    this.oAuthTokenUrl = url.toString();
  }

  private isTokenExpired(token: ConnectorToken): boolean {
    const now = new Date();
    now.setSeconds(now.getSeconds() - 5); // Allows for a threshold of -5s before considering the token expired

    const isExpired = token.expiresAt < now.toISOString();

    if (isExpired) {
      this.logger.debug(`Cached access token expired at [${token.expiresAt}]`);
    }

    return isExpired;
  }

  private async fetchAndStoreNewToken(
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<MicrosoftDefenderEndpointApiTokenResponse> {
    const {
      connector: { id: connectorId },
    } = this.params;
    const logger = this.logger;
    const connectorTokenClient = this.params.services.connectorTokenClient;

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
        `Successfully created an access token for Microsoft Defend for Endpoint:\n${JSON.stringify({
          ...newToken.data,
          access_token: '[REDACTED]',
        })}`
    );

    await connectorTokenClient.updateOrReplace({
      connectorId,
      tokenRequestDate,
      deleteExisting: true,
      token: this.connectorToken,
      newToken: newToken.data.access_token,
      expiresInSec: newToken.data.expires_in,
    });

    return newToken.data;
  }

  private async retrieveOrGenerateNewTokenIfNeeded(
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<void> {
    if (this.generatingNewTokenPromise) {
      this.logger.debug(`Returning pending retrieval of access token`);
      return await this.generatingNewTokenPromise;
    }

    this.generatingNewTokenPromise = new Promise(async (resolve, reject) => {
      try {
        const {
          connector: { id: connectorId },
        } = this.params;
        const logger = this.logger;
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

            logger.debug(() => `Found cached access token:\n${JSON.stringify(logToken, null, 2)}`);
          } else {
            logger.debug(`No cached access token found`);
          }
        }

        if (this.connectorToken && !this.isTokenExpired(this.connectorToken)) {
          logger.debug('Cached token is not expired - no need to request a new one');
          resolve();
          return;
        }

        await this.fetchAndStoreNewToken(connectorUsageCollector);

        const updatedCachedToken = await connectorTokenClient.get({
          connectorId,
          tokenType: this.tokenType,
        });

        if (!updatedCachedToken.connectorToken) {
          throw new Error(`Failed to retrieve cached [${this.tokenType}] after it was updated.`);
        }

        this.connectorToken = updatedCachedToken.connectorToken;

        resolve(undefined);
      } catch (error) {
        reject(error);
      }
    });

    return await this.generatingNewTokenPromise.then(() => {
      this.generatingNewTokenPromise = null;
    });
  }

  /**
   * Returns the Bearer token that should be used in API calls
   */
  public async get(connectorUsageCollector: ConnectorUsageCollector): Promise<string> {
    if (this.reGenerateNewTokenPromise) {
      this.logger.debug(`Waiting for pending token re-generation to complete before retrieving it`);
      await this.reGenerateNewTokenPromise;
    }

    await this.retrieveOrGenerateNewTokenIfNeeded(connectorUsageCollector);

    if (!this.connectorToken) {
      throw new Error('Access token for Microsoft Defend for Endpoint not available!');
    }

    return this.connectorToken.token;
  }

  /**
   * Forces a new token to be generated by calling the Microsoft API, regardless if the existing
   * one is expired or not. This method can be called multiple times, but it will only perform
   * a token re-generation once per class instance (there should be no need to do it more than once)
   */
  public async generateNew(connectorUsageCollector: ConnectorUsageCollector): Promise<void> {
    if (this.reGenerateNewTokenPromise) {
      this.logger.debug(`A request to generate a new token has already been requested!`);
      return await this.reGenerateNewTokenPromise;
    }

    this.reGenerateNewTokenPromise = new Promise(async (resolve, reject) => {
      try {
        const connectorTokenClient = this.params.services.connectorTokenClient;

        if (this.generatingNewTokenPromise) {
          this.logger.debug(
            `Waiting for current new token retrieval/generate to complete before performing proceeding with generating new one`
          );
          await this.generatingNewTokenPromise;
        }

        // First check if the token was already updated by another instance of the connector and if so, then do nothing
        if (this.connectorToken) {
          const currentToken = this.connectorToken.token;
          const latestStoredToken = await connectorTokenClient.get({
            connectorId: this.params.connector.id,
            tokenType: this.tokenType,
          });

          if (
            latestStoredToken.connectorToken &&
            latestStoredToken.connectorToken.token !== currentToken
          ) {
            this.logger.debug(
              `Token has been updated since it was last read. Using it instead of generating a new one.\n${JSON.stringify(
                {
                  ...latestStoredToken.connectorToken,
                  token: '[redacted]',
                },
                null,
                2
              )}`
            );
            this.connectorToken = latestStoredToken.connectorToken;
            return resolve(undefined);
          }
        }

        await this.fetchAndStoreNewToken(connectorUsageCollector);
        this.connectorToken = null;

        resolve(undefined);
      } catch (error) {
        reject(error);
      }
    });

    await this.reGenerateNewTokenPromise;
  }
}
