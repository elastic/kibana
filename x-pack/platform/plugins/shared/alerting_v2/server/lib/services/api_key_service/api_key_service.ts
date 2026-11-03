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
import {
  ApiKeysClient,
  encodeApiKey,
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

const encodeGrantedApiKey = (id?: string, key?: string): string | null =>
  id && key ? encodeApiKey(id, key) : null;

@injectable()
export class ApiKeyService implements ApiKeyServiceContract {
  private readonly apiKeys: ApiKeysClient;

  constructor(
    @inject(Request) private readonly request: KibanaRequest,
    @inject(CoreStart('security'))
    private readonly securityService: SecurityServiceStart,
    @inject(ApiKeyServiceSavedObjectsClientToken)
    private readonly invalidationSavedObjectsClient: SavedObjectsClientContract,
    @inject(PluginLogger) private readonly logger: Logger
  ) {
    this.apiKeys = new ApiKeysClient({
      security: securityService,
      logger,
      pluginTag: 'alerting_v2',
    });
  }

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

  private isAuthenticationTypeAPIKey(): boolean {
    const user = this.securityService.authc.getCurrentUser(this.request);
    return user?.authentication_type === 'api_key';
  }

  private getAuthenticationAPIKeyAttributes(name: string, username: string): ApiKeyAttributes {
    const requestApiKey = this.apiKeys.fromRequest(this.request);
    if (!requestApiKey) {
      throw new Error(
        `Failed to extract API key from authorization header for action policy: ${name}`
      );
    }

    if (requestApiKey.type === 'invalid') {
      throw new Error(
        `Failed to parse API key credentials from authorization header for action policy: ${name}`
      );
    }

    const { type, id, secret } = requestApiKey;
    // A raw `essu_…` Cloud API key carries no id, so Kibana can't store it.
    if (!id) {
      throw Boom.badRequest(getActionPolicyCloudApiKeyNotSupportedMessage(name), {
        code: ALERTING_ERROR_CODES.ACTION_POLICY_CLOUD_API_KEY_NOT_SUPPORTED,
      });
    }

    if (type === 'uiam' && !this.shouldGrantUiam()) {
      throw new Error('UIAM API keys should only be used in serverless environments');
    }

    return {
      apiKey: encodeApiKey(id, secret),
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
        apiKey: encodeGrantedApiKey(uiamResult.id, uiamResult.api_key)!,
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
      apiKey: encodeGrantedApiKey(esResult.id, esResult.api_key)!,
      owner: username,
      createdByUser: false,
    };
  }

  private shouldGrantUiam(): boolean {
    return !!this.securityService.authc.apiKeys.uiam;
  }
}
