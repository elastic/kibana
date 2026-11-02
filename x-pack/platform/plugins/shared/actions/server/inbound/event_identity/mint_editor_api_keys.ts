/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import {
  invalidateApiKeysNow,
  isCloudApiKeyNotSupportedError,
  resolveScopedApiKeys,
  type ApiKeyInvalidationTarget,
} from '@kbn/response-ops-scoped-api-keys';

import {
  createEventIdentityApiKeysDisabledError,
  createEventIdentityUiamUnsupportedError,
} from './errors';
import { identityFromCredentials } from './encode_api_key';
import {
  CONNECTOR_EVENT_IDENTITY_API_KEY_METADATA,
  connectorEventIdentityApiKeyName,
  type ConnectorEventIdentity,
} from './types';

const UIAM_LOGS_CREDENTIALS_TAGS = ['uiam', 'credentials'];
const UIAM_LOGS_GRANT_TAGS = ['uiam', 'uiam-api-key-grant'];
const UIAM_LOGS_INVALIDATE_TAGS = ['uiam', 'uiam-api-key-invalidate'];
const CONNECTOR_API_KEY = 'connector';

/** Mints framework-owned API keys for a connector's inbound events from the save request. */
export const mintConnectorEventIdentity = async ({
  request,
  securityService,
  logger,
  connectorId,
}: {
  request: KibanaRequest;
  securityService: SecurityServiceStart;
  logger: Logger;
  connectorId: string;
}): Promise<ConnectorEventIdentity> => {
  const name = connectorEventIdentityApiKeyName(connectorId);
  const created: ApiKeyInvalidationTarget[] = [];
  const invalidateCreated = async () => {
    const failed = await invalidateApiKeysNow({ security: securityService, logger }, created, {
      logContext: `connector event identity "${name}"`,
      logTags: UIAM_LOGS_INVALIDATE_TAGS,
    });
    if (failed.length > 0) {
      logger.error(
        `Failed to roll back ${failed.length} API key(s) for connector event identity "${name}"; they may remain valid.`
      );
    }
  };

  try {
    // The connector stores its own keys, so a caller's API key is always cloned.
    const resolved = await resolveScopedApiKeys(
      request,
      { security: securityService, logger },
      {
        names: new Map([[CONNECTOR_API_KEY, { es: name, uiam: `uiam-${name}` }]]),
        clone: true,
        uiamEnabled: securityService.authc.apiKeys.uiam !== undefined,
        metadata: CONNECTOR_EVENT_IDENTITY_API_KEY_METADATA,
        onKeyCreated: (target) => created.push(target),
        logTags: { credentials: UIAM_LOGS_CREDENTIALS_TAGS, grant: UIAM_LOGS_GRANT_TAGS },
      }
    );
    const credentials = resolved.enabled ? resolved.credentials.get(CONNECTOR_API_KEY) : undefined;
    if (!credentials) {
      throw createEventIdentityApiKeysDisabledError();
    }
    return identityFromCredentials(credentials);
  } catch (err) {
    await invalidateCreated();
    if (isCloudApiKeyNotSupportedError(err)) {
      throw createEventIdentityUiamUnsupportedError();
    }
    throw err;
  }
};
