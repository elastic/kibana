/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceParams, SubActionConnector } from '@kbn/actions-plugin/server';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/usage';
import { MicrosoftDefenderEndpointDoNotValidateResponseSchema } from '../../../common/microsoft_defender_endpoint/schema';
import {
  MicrosoftDefenderEndpointConfig,
  MicrosoftDefenderEndpointSecrets,
  MicrosoftDefenderEndpointApiTokenResponse,
} from '../../../common/microsoft_defender_endpoint/types';

export class OAuthTokenManager {
  private accessToken: string = '';
  private readonly oAuthTokenUrl: string;

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

  private async generateNewToken(connectorUsageCollector: ConnectorUsageCollector): Promise<void> {
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

    this.params.logger.debug(
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
