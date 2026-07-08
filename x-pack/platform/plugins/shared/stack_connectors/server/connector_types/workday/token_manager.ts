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
import {
  WorkdayApiDoNotValidateResponsesSchema,
  type WorkdayConfig,
  type WorkdayGetTokenResponse,
  type WorkdaySecrets,
} from '@kbn/connector-schemas/workday';

// Workday's OAuth2 token endpoint uses the Client Credentials grant with an
// integration-registered API Client. Credentials are sent as HTTP Basic
// (base64(clientId:clientSecret)) and the grant type is passed in the body.
export class WorkdayTokenManager {
  private connectorToken: ConnectorToken | null = null;
  private readonly tokenUrl: string;
  // Must be 'access_token' — ConnectorTokenClient.updateOrReplace hardcodes it.
  private readonly tokenType = 'access_token';
  private generatingNewTokenPromise: Promise<void> | null = null;
  private reGenerateNewTokenPromise: Promise<void> | null = null;
  private readonly base64encodedToken: string;
  protected logger: Logger;

  constructor(
    private readonly params: ServiceParams<WorkdayConfig, WorkdaySecrets> & {
      apiRequest: SubActionConnector<WorkdayConfig, WorkdaySecrets>['request'];
    }
  ) {
    this.logger = params.logger.get('workdayTokenManager');
    this.tokenUrl = params.config.tokenUrl;
    this.base64encodedToken = Buffer.from(
      params.secrets.clientId + ':' + params.secrets.clientSecret
    ).toString('base64');
  }

  private isTokenExpired(token: ConnectorToken): boolean {
    const now = new Date();
    now.setSeconds(now.getSeconds() - 5);
    const isExpired = token.expiresAt ? token.expiresAt < now.toISOString() : true;
    if (isExpired) {
      this.logger.debug(`Cached Workday access token expired at [${token.expiresAt}]`);
    }
    return isExpired;
  }

  private async fetchAndStoreNewToken(
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<WorkdayGetTokenResponse> {
    const {
      connector: { id: connectorId },
    } = this.params;
    const connectorTokenClient = this.params.services.connectorTokenClient;

    this.logger.debug(`Requesting new Workday access token for connector [${connectorId}]`);

    const tokenRequestDate = Date.now();
    const newToken = await this.params.apiRequest<WorkdayGetTokenResponse>(
      {
        url: this.tokenUrl,
        method: 'post',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          authorization: 'Basic ' + this.base64encodedToken,
        },
        data: 'grant_type=client_credentials',
        responseSchema:
          WorkdayApiDoNotValidateResponsesSchema as unknown as typeof WorkdayApiDoNotValidateResponsesSchema,
      },
      connectorUsageCollector
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
      return await this.generatingNewTokenPromise;
    }

    this.generatingNewTokenPromise = new Promise(async (resolve, reject) => {
      try {
        const {
          connector: { id: connectorId },
        } = this.params;
        const connectorTokenClient = this.params.services.connectorTokenClient;

        if (!this.connectorToken) {
          const cachedToken = await connectorTokenClient.get({
            connectorId,
            tokenType: this.tokenType,
          });

          if (cachedToken.connectorToken) {
            this.connectorToken = cachedToken.connectorToken;
          }
        }

        if (this.connectorToken && !this.isTokenExpired(this.connectorToken)) {
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

  public async get(connectorUsageCollector: ConnectorUsageCollector): Promise<string> {
    if (this.reGenerateNewTokenPromise) {
      await this.reGenerateNewTokenPromise;
    }
    await this.retrieveOrGenerateNewTokenIfNeeded(connectorUsageCollector);
    if (!this.connectorToken) {
      throw new Error('Access token for Workday not available!');
    }
    return this.connectorToken.token;
  }

  public async generateNew(connectorUsageCollector: ConnectorUsageCollector): Promise<void> {
    if (this.reGenerateNewTokenPromise) {
      return await this.reGenerateNewTokenPromise;
    }

    this.reGenerateNewTokenPromise = new Promise(async (resolve, reject) => {
      try {
        const connectorTokenClient = this.params.services.connectorTokenClient;
        if (this.generatingNewTokenPromise) {
          await this.generatingNewTokenPromise;
        }

        // A peer instance may have already refreshed the token.
        if (this.connectorToken) {
          const currentToken = this.connectorToken.token;
          const latest = await connectorTokenClient.get({
            connectorId: this.params.connector.id,
            tokenType: this.tokenType,
          });
          if (latest.connectorToken && latest.connectorToken.token !== currentToken) {
            this.connectorToken = latest.connectorToken;
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
