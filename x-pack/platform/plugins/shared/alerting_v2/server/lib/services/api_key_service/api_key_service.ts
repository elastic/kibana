/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { Logger as PluginLogger } from '@kbn/core-di';
import { CoreStart, Request } from '@kbn/core-di-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import { HTTPAuthorizationHeader, isUiamCredential } from '@kbn/core-security-server';
import {
  getInvalidationTargets,
  queueInvalidationTargets,
  type QueueResult,
} from '@kbn/response-ops-api-keys';
import { inject, injectable } from 'inversify';
import { API_KEY_PENDING_INVALIDATION_TYPE } from '../../../saved_objects';
import { getActionPolicyCloudApiKeyNotSupportedMessage } from '../../errors/action_policy_error_messages';
import { ALERTING_ERROR_CODES } from '../../errors/error_codes';
import { ApiKeyServiceSavedObjectsClientToken } from './tokens';

export interface ApiKeyAttributes {
  apiKey: string;
  owner: string;
  createdByUser: boolean;
}

/**
 * Outcome of registering a single API key for invalidation. Returned instead
 * of thrown so a caller invalidating a batch still learns about the keys that
 * did register, and so best-effort callers can keep ignoring the result.
 */
export type ApiKeyInvalidationResult = QueueResult;

export interface ApiKeyServiceContract {
  create(name: string): Promise<ApiKeyAttributes>;
  markApiKeysForInvalidation(apiKeys: string[]): Promise<ApiKeyInvalidationResult[]>;
}

const encodeApiKey = (id?: string, key?: string): string | null => {
  return id && key ? Buffer.from(`${id}:${key}`).toString('base64') : null;
};

@injectable()
export class ApiKeyService implements ApiKeyServiceContract {
  constructor(
    @inject(Request) private readonly request: KibanaRequest,
    @inject(CoreStart('security'))
    private readonly securityService: SecurityServiceStart,
    @inject(ApiKeyServiceSavedObjectsClientToken)
    private readonly invalidationSavedObjectsClient: SavedObjectsClientContract,
    @inject(PluginLogger) private readonly logger: Logger
  ) {}

  public async create(name: string): Promise<ApiKeyAttributes> {
    const username = this.securityService.authc.getCurrentUser(this.request)?.username;
    if (!username) {
      throw new Error(
        `Failed to create API key for action policy: ${name} - unable to determine current user`
      );
    }

    const isApiKeyAuth = this.isAuthenticationTypeAPIKey();

    if (isApiKeyAuth) {
      return this.getAuthenticationAPIKeyAttributes(name, username);
    }

    return this.grantAPIKeyAttributes(name, username);
  }

  public async markApiKeysForInvalidation(apiKeys: string[]): Promise<ApiKeyInvalidationResult[]> {
    // Each stored `apiKey` yields at most one target; keys with none have nothing to queue.
    const targetsByKey = apiKeys.map((apiKey) => getInvalidationTargets({ apiKey }));
    const results = await queueInvalidationTargets(targetsByKey.flat(), {
      type: API_KEY_PENDING_INVALIDATION_TYPE,
      savedObjectsClient: this.invalidationSavedObjectsClient,
      logger: this.logger,
    });

    let next = 0;
    return targetsByKey.map((targets) =>
      targets.length > 0 ? results[next++] : { success: true }
    );
  }

  private decodeApiKey(key: string): { apiKeyId: string; apiKeyValue?: string } {
    const [id, apiKey] = Buffer.from(key, 'base64').toString().split(':');
    return { apiKeyId: id, apiKeyValue: apiKey };
  }

  private isAuthenticationTypeAPIKey(): boolean {
    const user = this.securityService.authc.getCurrentUser(this.request);
    return user?.authentication_type === 'api_key';
  }

  private getAuthenticationAPIKeyAttributes(name: string, username: string): ApiKeyAttributes {
    const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(this.request);
    if (!authorizationHeader?.credentials) {
      throw new Error(
        `Failed to extract API key from authorization header for action policy: ${name}`
      );
    }

    if (isUiamCredential(authorizationHeader)) {
      throw Boom.badRequest(getActionPolicyCloudApiKeyNotSupportedMessage(name), {
        code: ALERTING_ERROR_CODES.ACTION_POLICY_CLOUD_API_KEY_NOT_SUPPORTED,
      });
    }

    const { apiKeyId, apiKeyValue } = this.decodeApiKey(authorizationHeader.credentials);

    if (!apiKeyId || !apiKeyValue) {
      throw new Error(
        `Failed to parse API key credentials from authorization header for action policy: ${name}`
      );
    }

    if (isUiamCredential(apiKeyValue) && !this.shouldGrantUiam()) {
      throw new Error('UIAM API keys should only be used in serverless environments');
    }

    const encoded = encodeApiKey(apiKeyId, apiKeyValue)!;

    return {
      apiKey: encoded,
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
        throw new Error(`Failed to create UIAM API key for action policy: ${name}`);
      }

      return {
        apiKey: encodeApiKey(uiamResult.id, uiamResult.api_key)!,
        owner: username,
        createdByUser: false,
      };
    }

    const esResult = await this.securityService.authc.apiKeys.grantAsInternalUser(this.request, {
      name,
      role_descriptors: {},
      metadata: { managed: true, kibana: { type: 'action_policy' } },
    });

    if (!esResult) {
      throw new Error(`Failed to create ES API key for action policy: ${name}`);
    }

    return {
      apiKey: encodeApiKey(esResult.id, esResult.api_key)!,
      owner: username,
      createdByUser: false,
    };
  }

  private shouldGrantUiam(): boolean {
    return !!this.securityService.authc.apiKeys.uiam;
  }
}
