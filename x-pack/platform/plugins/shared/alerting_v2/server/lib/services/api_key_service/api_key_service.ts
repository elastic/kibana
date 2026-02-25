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
import type { GrantAPIKeyResult } from '@kbn/security-plugin/server';
import { inject, injectable } from 'inversify';

export interface ApiKeyAttributes {
  apiKey: string;
  uiamApiKey: string | null;
  apiKeyOwner: string;
  apiKeyCreatedByUser: boolean;
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

    if (isUiamCredential(apiKey)) {
      return {
        apiKey: encoded,
        uiamApiKey: encoded,
        apiKeyOwner: username,
        apiKeyCreatedByUser: true,
      };
    }

    return {
      apiKey: encoded,
      uiamApiKey: null,
      apiKeyOwner: username,
      apiKeyCreatedByUser: true,
    };
  }

  private async grantAPIKeyAttributes(name: string, username: string): Promise<ApiKeyAttributes> {
    let uiamResult: GrantAPIKeyResult | null | undefined;
    if (this.shouldGrantUiam()) {
      uiamResult = await this.securityService.authc.apiKeys.uiam?.grant(this.request, {
        name: `uiam-${name}`,
      });

      if (!uiamResult) {
        throw new Error(`Failed to create UIAM API key for notification policy: ${name}`);
      }
    }

    let esResult: GrantAPIKeyResult | null = null;
    try {
      esResult = await this.securityService.authc.apiKeys.grantAsInternalUser(this.request, {
        name,
        role_descriptors: {},
        metadata: { managed: true, kibana: { type: 'notification_policy' } },
      });
    } catch (err) {
      if (uiamResult?.id) {
        await this.securityService.authc.apiKeys.uiam
          ?.invalidate(this.request, { id: uiamResult.id })
          .catch(() => {});
      }
      throw err;
    }

    if (!esResult) {
      if (uiamResult?.id) {
        await this.securityService.authc.apiKeys.uiam
          ?.invalidate(this.request, { id: uiamResult.id })
          .catch(() => {});
      }
      throw new Error(`Failed to create ES API key for notification policy: ${name}`);
    }

    return {
      apiKey: encodeApiKey(esResult.id, esResult.api_key)!,
      uiamApiKey: uiamResult ? encodeApiKey(uiamResult.id, uiamResult.api_key) : null,
      apiKeyOwner: username,
      apiKeyCreatedByUser: false,
    };
  }

  private shouldGrantUiam(): boolean {
    return !!this.securityService.authc.apiKeys.uiam;
  }
}
