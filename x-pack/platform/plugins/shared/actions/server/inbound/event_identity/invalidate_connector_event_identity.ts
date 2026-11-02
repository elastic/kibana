/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import { decodeApiKeyId, isUiamCredential } from '@kbn/core-security-server';
import {
  decodeStoredApiKey,
  getApiKeyInvalidationTargets,
  invalidateApiKeysNow,
} from '@kbn/response-ops-scoped-api-keys';

import { connectorEventIdentityApiKeyName, type ConnectorEventIdentity } from './types';

const UIAM_LOGS_INVALIDATE_TAGS = ['uiam', 'uiam-api-key-invalidate'];

export const invalidateConnectorEventIdentity = async ({
  identity,
  securityService,
  logger,
  connectorId,
}: {
  identity: ConnectorEventIdentity;
  securityService: SecurityServiceStart;
  logger: Logger;
  connectorId: string;
}): Promise<void> => {
  const name = connectorEventIdentityApiKeyName(connectorId);
  const logContext = `connector event identity "${name}"`;

  const uiam = identity.uiamApiKey ? decodeStoredApiKey(identity.uiamApiKey) : undefined;
  const uiamSecret = uiam?.secret && isUiamCredential(uiam.secret) ? uiam.secret : undefined;
  if (uiam && !uiamSecret) {
    logger.error(
      `Failed to synchronously invalidate UIAM API key for ${logContext}: stored credential is not a UIAM API key`,
      { tags: UIAM_LOGS_INVALIDATE_TAGS }
    );
  }

  const targets = getApiKeyInvalidationTargets({
    createdByUser: false,
    esApiKeyId: identity.apiKey ? decodeApiKeyId(identity.apiKey) : undefined,
    uiamApiKeyId: uiam?.id,
    uiamApiKey: uiamSecret,
  });

  const failed = await invalidateApiKeysNow({ security: securityService, logger }, targets, {
    logContext,
    logTags: UIAM_LOGS_INVALIDATE_TAGS,
  });
  if (failed.length > 0) {
    logger.error(
      `Failed to invalidate ${failed.length} API key(s) for ${logContext}; they may remain valid.`
    );
  }
};
