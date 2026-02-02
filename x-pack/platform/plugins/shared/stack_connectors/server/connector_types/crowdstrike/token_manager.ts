/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceParams, SubActionConnector } from '@kbn/actions-plugin/server';
import type { ConnectorUsageCollector } from '@kbn/actions-plugin/server/usage';
import type { ConnectorToken } from '@kbn/actions-plugin/server/types';
import type { Logger } from '@kbn/logging';
import { CrowdstrikeApiDoNotValidateResponsesSchema } from '../../../common/crowdstrike/schema';
import type {
  CrowdstrikeConfig,
  CrowdstrikeSecrets,
  CrowdstrikeGetTokenResponse,
} from '../../../common/crowdstrike/types';

export class CrowdStrikeTokenManager {
  private connectorToken: ConnectorToken | null = null;
  private readonly tokenUrl: string;
  // NOTE: this `tokenType` here MUST be `access_token` due to the use of
  //       `ConnectorTokenClient.updateOrReplace()` method, which hardcodes the `tokenType`
  private readonly tokenType = 'access_token';
  private generatingNewTokenPromise: Promise<void> | null = null;
  private reGenerateNewTokenPromise: Promise<void> | null = null;
  private readonly base64encodedToken: string;
  protected logger: Logger;

  constructor(
    private readonly params: ServiceParams<CrowdstrikeConfig, CrowdstrikeSecrets> & {
      apiRequest: SubActionConnector<CrowdstrikeConfig, CrowdstrikeSecrets>['request'];
    }
  ) {
    this.logger = params.logger.get('crowdStrikeTokenManager');
    this.tokenUrl = `${params.config.url}/oauth2/token`;
    this.base64encodedToken = Buffer.from(
      params.secrets.clientId + ':' + params.secrets.clientSecret
    ).toString('base64');

    this.logger.debug('CrowdStrikeTokenManager initialized');
  }

  private isTokenExpired(token: ConnectorToken): boolean {
    const now = new Date();
    now.setSeconds(now.getSeconds() - 5); // 5-second safety margin

    const isExpired = token.expiresAt < now.toISOString();

    if (isExpired) {
      this.logger.debug(`Cached access token expired at [${token.expiresAt}]`);
    }

    return isExpired;
  }

  private async fetchAndStoreNewToken(
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<CrowdstrikeGetTokenResponse> {
    const {
      connector: { id: connectorId },
    } = this.params;
    const logger = this.logger;
    const connectorTokenClient = this.params.services.connectorTokenClient;

    logger.debug(`Requesting a new CrowdStrike access token for connector id [${connectorId}]`);

    const tokenRequestDate = Date.now();
    const newToken = await this.params.apiRequest<CrowdstrikeGetTokenResponse>(
      {
        url: this.tokenUrl,
        method: 'post',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          authorization: 'Basic ' + this.base64encodedToken,
        },
        responseSchema:
          CrowdstrikeApiDoNotValidateResponsesSchema as unknown as typeof CrowdstrikeApiDoNotValidateResponsesSchema,
      },
      connectorUsageCollector
    );

    logger.debug(
      () =>
        `Successfully created an access token for CrowdStrike:\n${JSON.stringify({
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
      throw new Error('Access token for CrowdStrike not available!');
    }

    return this.connectorToken.token;
  }

  /**
   * Forces a new token to be generated by calling the CrowdStrike API, regardless if the existing
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
            `Waiting for current new token retrieval/generate to complete before proceeding with generating new one`
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
