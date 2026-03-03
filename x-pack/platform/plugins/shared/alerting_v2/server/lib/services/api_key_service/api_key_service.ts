/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, Request } from '@kbn/core-di-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import { HTTPAuthorizationHeader, isUiamCredential } from '@kbn/core-security-server';
import { inject, injectable } from 'inversify';

export interface ApiKeyAttributes {
  apiKey: string;
  type: 'es' | 'uiam';
  owner: string;
  createdByUser: boolean;
}

export interface ApiKeyServiceContract {
  create(name: string): Promise<ApiKeyAttributes>;
}

const encodeApiKey = (id?: string, key?: string): string | null => {
  return id && key ? Buffer.from(`${id}:${key}`).toString('base64') : null;
};

@injectable()
export class ApiKeyService implements ApiKeyServiceContract {
  constructor(
    @inject(Request) private readonly request: KibanaRequest,
    @inject(CoreStart('security'))
    private readonly securityService: SecurityServiceStart
  ) {}

  public async create(name: string): Promise<ApiKeyAttributes> {
    const username = this.securityService.authc.getCurrentUser(this.request)?.username;
    if (!username) {
      throw new Error(
        `Failed to create API key for notification policy: ${name} - unable to determine current user`
      );
    }

    const isApiKeyAuth = this.isAuthenticationTypeAPIKey();

    if (isApiKeyAuth) {
      return this.getAuthenticationAPIKeyAttributes(name, username);
    }

    return this.grantAPIKeyAttributes(name, username);
  }

  private isAuthenticationTypeAPIKey(): boolean {
    const user = this.securityService.authc.getCurrentUser(this.request);
    return user?.authentication_type === 'api_key';
  }

  private getAuthenticationAPIKeyAttributes(name: string, username: string): ApiKeyAttributes {
    const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(this.request);
    if (!authorizationHeader?.credentials) {
      throw new Error(
        `Failed to extract API key from authorization header for notification policy: ${name}`
      );
    }

    const [apiKeyId, apiKey] = Buffer.from(authorizationHeader.credentials, 'base64')
      .toString()
      .split(':');

    if (!apiKeyId || !apiKey) {
      throw new Error(
        `Failed to parse API key credentials from authorization header for notification policy: ${name}`
      );
    }

    if (isUiamCredential(apiKey) && !this.shouldGrantUiam()) {
      throw new Error('UIAM API keys should only be used in serverless environments');
    }

    const encoded = encodeApiKey(apiKeyId, apiKey)!;

    return {
      apiKey: encoded,
      type: isUiamCredential(apiKey) ? 'uiam' : 'es',
      owner: username,
      createdByUser: true,
    };
  }

  private async grantAPIKeyAttributes(name: string, username: string): Promise<ApiKeyAttributes> {
    if (this.shouldGrantUiam()) {
      const uiamResult = await this.securityService.authc.apiKeys.uiam?.grant(this.request, {
        name: `uiam-${name}`,
      });

      if (!uiamResult) {
        throw new Error(`Failed to create UIAM API key for notification policy: ${name}`);
      }

      return {
        apiKey: encodeApiKey(uiamResult.id, uiamResult.api_key)!,
        type: 'uiam',
        owner: username,
        createdByUser: false,
      };
    }

    const esResult = await this.securityService.authc.apiKeys.grantAsInternalUser(this.request, {
      name,
      role_descriptors: {},
      metadata: { managed: true, kibana: { type: 'notification_policy' } },
    });

    if (!esResult) {
      throw new Error(`Failed to create ES API key for notification policy: ${name}`);
    }

    return {
      apiKey: encodeApiKey(esResult.id, esResult.api_key)!,
      type: 'es',
      owner: username,
      createdByUser: false,
    };
  }

  private shouldGrantUiam(): boolean {
    return !!this.securityService.authc.apiKeys.uiam;
  }
}
