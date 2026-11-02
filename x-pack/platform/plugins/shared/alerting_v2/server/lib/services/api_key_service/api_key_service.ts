/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { isSavedObjectErrorResult } from '@kbn/core/server';
import { Logger as PluginLogger } from '@kbn/core-di';
import { CoreStart, Request } from '@kbn/core-di-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import { isUiamCredential } from '@kbn/core-security-server';
import type {
  ApiKeyInvalidationTarget,
  ScopedCredentials,
} from '@kbn/response-ops-scoped-api-keys';
import {
  decodeStoredApiKey,
  encodeApiKey,
  getApiKeyFromRequest,
  getApiKeyInvalidationTargets,
  resolveScopedApiKeys,
} from '@kbn/response-ops-scoped-api-keys';
import { inject, injectable } from 'inversify';
import { API_KEY_PENDING_INVALIDATION_TYPE } from '../../../saved_objects';
import { getActionPolicyCloudApiKeyNotSupportedMessage } from '../../errors/action_policy_error_messages';
import { ALERTING_ERROR_CODES } from '../../errors/error_codes';
import { ApiKeyServiceSavedObjectsClientToken } from './tokens';

export interface ApiKeyAttributes {
  apiKey: string;
  owner: string;
  createdByUser: boolean;
  /** Set when `apiKey` is a user-created (external) Cloud API key. */
  uiamExternal?: true;
}

/**
 * Outcome of registering a single API key for invalidation. Returned instead
 * of thrown so a caller invalidating a batch still learns about the keys that
 * did register, and so best-effort callers can keep ignoring the result.
 */
export type ApiKeyInvalidationResult = { success: true } | { success: false; message: string };

export interface ApiKeyServiceContract {
  create(name: string): Promise<ApiKeyAttributes>;
  markApiKeysForInvalidation(apiKeys: string[]): Promise<ApiKeyInvalidationResult[]>;
}

const POLICY_API_KEY = 'policy';

/** Maps the single resolved key onto the stored `base64(id:secret)`, or the raw Cloud API key. */
const toStoredApiKey = ({ es, uiam }: ScopedCredentials): string | undefined => {
  if (uiam) {
    if (!uiam.secret) return undefined;
    return uiam.id ? encodeApiKey(uiam.id, uiam.secret) : uiam.secret;
  }
  return es?.id && es.secret ? encodeApiKey(es.id, es.secret) : undefined;
};

/** A raw Cloud API key has no id, so it never yields a target; nothing Kibana owns to invalidate. */
const toInvalidationTarget = (apiKey: string): ApiKeyInvalidationTarget | undefined => {
  if (isUiamCredential(apiKey)) {
    return undefined;
  }
  const { id, secret } = decodeStoredApiKey(apiKey);
  const [target] = getApiKeyInvalidationTargets(
    secret && isUiamCredential(secret)
      ? { createdByUser: false, uiamApiKeyId: id, uiamApiKey: secret }
      : { createdByUser: false, esApiKeyId: id }
  );
  return target;
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

    const uiamEnabled = !!this.securityService.authc.apiKeys.uiam;
    let result;
    try {
      result = await resolveScopedApiKeys(
        this.request,
        { security: this.securityService, logger: this.logger },
        {
          names: new Map([[POLICY_API_KEY, { es: name, uiam: `uiam-${name}` }]]),
          storage: 'single',
          uiamEnabled,
          uiamRequired: true,
          metadata: { managed: true, kibana: { type: 'action_policy' } },
        }
      );
    } catch (e) {
      throw this.isCloudApiKeyRejection(e)
        ? Boom.badRequest(getActionPolicyCloudApiKeyNotSupportedMessage(name), {
            code: ALERTING_ERROR_CODES.ACTION_POLICY_CLOUD_API_KEY_NOT_SUPPORTED,
          })
        : e;
    }

    const credentials = result.enabled ? result.credentials.get(POLICY_API_KEY) : undefined;
    const apiKey = credentials ? toStoredApiKey(credentials) : undefined;
    if (!credentials || !apiKey) {
      throw new Error(
        `Failed to create ${uiamEnabled ? 'UIAM' : 'ES'} API key for action policy: ${name}`
      );
    }

    return {
      apiKey,
      owner: username,
      createdByUser: credentials.createdByUser,
      ...(credentials.uiamExternal ? { uiamExternal: true as const } : {}),
    };
  }

  public async markApiKeysForInvalidation(apiKeys: string[]): Promise<ApiKeyInvalidationResult[]> {
    const targets = apiKeys.map(toInvalidationTarget);
    const queued = targets.filter((target): target is ApiKeyInvalidationTarget => !!target);
    if (queued.length === 0) {
      return apiKeys.map((): ApiKeyInvalidationResult => ({ success: true }));
    }

    const apiKeysToInvalidate = queued.map(({ apiKeyId, uiamApiKey }) => ({
      attributes: {
        apiKeyId,
        createdAt: new Date().toISOString(),
        ...(uiamApiKey ? { uiamApiKey } : {}),
      },
      type: API_KEY_PENDING_INVALIDATION_TYPE,
    }));

    let response;
    try {
      response = await this.invalidationSavedObjectsClient.bulkCreate(apiKeysToInvalidate);
    } catch (e) {
      const message = (e as Error).message;
      this.logger.error(
        `Failed to bulk mark list of API keys [${queued
          .map(({ apiKeyId }) => `"${apiKeyId}"`)
          .join(', ')}] for invalidation: ${message}`,
        {
          error: { stack_trace: (e as Error).stack },
        }
      );
      return apiKeys.map((): ApiKeyInvalidationResult => ({ success: false, message }));
    }

    let index = 0;
    return targets.map((target): ApiKeyInvalidationResult => {
      if (!target) {
        return { success: true };
      }
      const created = response.saved_objects[index++];
      if (created && !isSavedObjectErrorResult(created)) {
        return { success: true };
      }

      const message = created
        ? created.error.message
        : 'Saved object was not returned by bulkCreate';
      this.logger.error(`Failed to mark API key "${target.apiKeyId}" for invalidation: ${message}`);
      return { success: false, message };
    });
  }

  private isCloudApiKeyRejection(e: unknown): boolean {
    const secret = getApiKeyFromRequest(this.request)?.api_key;
    return Boom.isBoom(e) && e.output.statusCode === 400 && !!secret && isUiamCredential(secret);
  }
}
