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
import type { ApiKeys, ApiKeysClient, QueueResult } from '@kbn/response-ops-api-keys';
import {
  CloudApiKeyNotSupportedError,
  getInvalidationTargets,
  queueInvalidationTargets,
} from '@kbn/response-ops-api-keys';
import { inject, injectable } from 'inversify';
import { API_KEY_PENDING_INVALIDATION_TYPE } from '../../../saved_objects';
import {
  createAlertingV2ApiKeysClient,
  getActionPolicyApiKeySubject,
} from '../../../api_keys/client';
import { actionPolicyApiKeyStorage } from '../../../api_keys/storage';
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
    this.apiKeys = createAlertingV2ApiKeysClient(securityService, logger);
  }

  public async create(name: string): Promise<ApiKeyAttributes> {
    const username = this.securityService.authc.getCurrentUser(this.request)?.username;
    if (!username) {
      throw new Error(
        `Failed to create API key for action policy: ${name} - unable to determine current user`
      );
    }

    const keys = await this.resolveApiKeys(name);
    const { apiKey } = actionPolicyApiKeyStorage.write(keys);
    if (!apiKey) {
      throw new Error(`Failed to create ES API key for action policy: ${name}`);
    }
    return { apiKey, owner: username, createdByUser: keys.createdByUser };
  }

  public async markApiKeysForInvalidation(apiKeys: string[]): Promise<ApiKeyInvalidationResult[]> {
    // Each stored key yields at most one target; keys with none have nothing to queue.
    const targetsByKey = apiKeys.map((apiKey) =>
      getInvalidationTargets(actionPolicyApiKeyStorage.read({ apiKey }))
    );
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

  /** A raw Cloud API key has no id, so it can't be stored on a policy. */
  private async resolveApiKeys(name: string): Promise<ApiKeys> {
    const cloudApiKeyNotSupported = () =>
      Boom.badRequest(getActionPolicyCloudApiKeyNotSupportedMessage(name), {
        code: ALERTING_ERROR_CODES.ACTION_POLICY_CLOUD_API_KEY_NOT_SUPPORTED,
      });

    let keys: ApiKeys | null;
    try {
      keys = await this.apiKeys.resolve(this.request, {
        name,
        subject: getActionPolicyApiKeySubject(name),
      });
    } catch (err) {
      throw err instanceof CloudApiKeyNotSupportedError ? cloudApiKeyNotSupported() : err;
    }

    if (!keys) {
      throw new Error(`Failed to create ES API key for action policy: ${name}`);
    }
    if (keys.createdByUser && keys.uiam && !keys.uiam.id) {
      throw cloudApiKeyNotSupported();
    }
    return keys;
  }
}
