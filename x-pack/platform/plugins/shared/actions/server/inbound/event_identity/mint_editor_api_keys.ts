/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { GrantAPIKeyResult, SecurityServiceStart } from '@kbn/core-security-server';
import { HTTPAuthorizationHeader, isUiamCredential } from '@kbn/core-security-server';

import { createEventIdentityUiamUnsupportedError } from './errors';
import { identityFromGrantResults } from './encode_api_key';
import {
  CONNECTOR_EVENT_IDENTITY_API_KEY_METADATA,
  connectorEventIdentityApiKeyName,
  type ConnectorEventIdentity,
} from './types';

const UIAM_LOGS_CREDENTIALS_TAGS = ['uiam', 'credentials'];
const UIAM_LOGS_GRANT_TAGS = ['uiam', 'uiam-api-key-grant'];
const UIAM_LOGS_INVALIDATE_TAGS = ['uiam', 'uiam-api-key-invalidate'];

const shouldGrantUiam = (securityService: SecurityServiceStart): boolean =>
  securityService.authc.apiKeys.uiam !== undefined;

const isAuthenticationTypeAPIKey = (
  request: KibanaRequest,
  securityService: SecurityServiceStart
): boolean => {
  const user = securityService.authc.getCurrentUser(request);
  if (user?.authentication_type) {
    return user.authentication_type === 'api_key';
  }
  const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(request);
  return authorizationHeader?.scheme.toLowerCase() === 'apikey';
};

const grantUiamApiKey = async ({
  request,
  securityService,
  logger,
  name,
}: {
  request: KibanaRequest;
  securityService: SecurityServiceStart;
  logger: Logger;
  name: string;
}): Promise<GrantAPIKeyResult | undefined> => {
  if (!shouldGrantUiam(securityService)) {
    return undefined;
  }

  const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(request);
  if (!authorizationHeader || !isUiamCredential(authorizationHeader)) {
    logger.error(
      `Failed to create UIAM API key for connector event identity "${name}": Invalid or missing UIAM credentials`,
      { tags: UIAM_LOGS_CREDENTIALS_TAGS }
    );
    return undefined;
  }

  try {
    const result = await securityService.authc.apiKeys.uiam?.grant(request, {
      name: `uiam-${name}`,
    });
    if (!result) {
      logger.error(`Failed to create UIAM API key for connector event identity "${name}"`, {
        tags: UIAM_LOGS_GRANT_TAGS,
      });
      return undefined;
    }
    return result;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error(
      `Failed to create UIAM API key for connector event identity "${name}": ${errorMessage}`,
      {
        tags: UIAM_LOGS_GRANT_TAGS,
        error: { stack_trace: err instanceof Error ? err.stack : undefined },
      }
    );
    return undefined;
  }
};

const invalidateUiamApiKey = async ({
  request,
  securityService,
  logger,
  name,
  id,
}: {
  request: KibanaRequest;
  securityService: SecurityServiceStart;
  logger: Logger;
  name: string;
  id: string;
}): Promise<void> => {
  const result = await securityService.authc.apiKeys.uiam?.invalidate(request, { id });
  if (result && result.error_count > 0) {
    logger.error(
      `Failed to invalidate UIAM API key for connector event identity "${name}": ${result.error_details
        ?.map((error) => error.reason)
        .join(', ')}`,
      { tags: UIAM_LOGS_INVALIDATE_TAGS }
    );
  }
};

const grantEsAndUiam = async ({
  request,
  securityService,
  logger,
  name,
}: {
  request: KibanaRequest;
  securityService: SecurityServiceStart;
  logger: Logger;
  name: string;
}): Promise<ConnectorEventIdentity> => {
  const uiamResult = await grantUiamApiKey({ request, securityService, logger, name });

  let esResult: GrantAPIKeyResult | null;
  try {
    esResult = await securityService.authc.apiKeys.grantAsInternalUser(request, {
      name,
      role_descriptors: {},
      metadata: CONNECTOR_EVENT_IDENTITY_API_KEY_METADATA,
    });
  } catch (err) {
    if (uiamResult?.id) {
      await invalidateUiamApiKey({
        request,
        securityService,
        logger,
        name,
        id: uiamResult.id,
      });
    }
    throw err;
  }

  if (!esResult) {
    if (uiamResult?.id) {
      await invalidateUiamApiKey({
        request,
        securityService,
        logger,
        name,
        id: uiamResult.id,
      });
    }
    return identityFromGrantResults({});
  }

  return identityFromGrantResults({
    esResult,
    ...(uiamResult ? { uiamResult } : {}),
  });
};

const cloneFromRequest = async ({
  request,
  securityService,
  logger,
  name,
}: {
  request: KibanaRequest;
  securityService: SecurityServiceStart;
  logger: Logger;
  name: string;
}): Promise<ConnectorEventIdentity> => {
  const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(request);
  if (authorizationHeader && isUiamCredential(authorizationHeader)) {
    if (!shouldGrantUiam(securityService)) {
      throw createEventIdentityUiamUnsupportedError();
    }
    const uiamResult = await grantUiamApiKey({ request, securityService, logger, name });
    if (!uiamResult) {
      throw createEventIdentityUiamUnsupportedError();
    }
    return identityFromGrantResults({ uiamResult });
  }

  const cloneResult = await securityService.authc.apiKeys.cloneAsInternalUser(request, {
    name,
    metadata: CONNECTOR_EVENT_IDENTITY_API_KEY_METADATA,
  });
  if (!cloneResult) {
    throw new Error('API key clone returned null (security feature may be disabled)');
  }
  return identityFromGrantResults({ esResult: cloneResult });
};

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

  if (isAuthenticationTypeAPIKey(request, securityService)) {
    return cloneFromRequest({ request, securityService, logger, name });
  }

  return grantEsAndUiam({ request, securityService, logger, name });
};
