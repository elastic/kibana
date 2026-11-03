/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import { HTTPAuthorizationHeader } from '@kbn/core-security-server';
import {
  ApiKeysClient,
  UiamUnavailableError,
  type CreateOptions,
} from '@kbn/response-ops-api-keys';

import { createEventIdentityUiamUnsupportedError } from './errors';
import { identityFromGrantResults } from './identity_attributes';
import {
  CONNECTOR_EVENT_IDENTITY_API_KEY_METADATA,
  connectorEventIdentityApiKeyName,
  type ConnectorEventIdentity,
} from './types';

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

const isUiamServiceAccount = (
  request: KibanaRequest,
  securityService: SecurityServiceStart
): boolean => {
  const principal = securityService.authc.getPrincipal(request);
  return principal?.type === 'service_account' && principal.variant === 'uiam';
};

const mint = async (
  apiKeys: ApiKeysClient,
  request: KibanaRequest,
  securityService: SecurityServiceStart,
  options: CreateOptions
): Promise<ConnectorEventIdentity> => {
  // `grant` gives a UIAM service account a UIAM key only, so it must not take the clone path.
  if (
    !isUiamServiceAccount(request, securityService) &&
    isAuthenticationTypeAPIKey(request, securityService)
  ) {
    const { es, uiam } = await apiKeys.clone(request, options);
    if (!es && !uiam) {
      throw createEventIdentityUiamUnsupportedError();
    }
    return identityFromGrantResults({ esResult: es, uiamResult: uiam });
  }

  const keys = await apiKeys.grant(request, options);
  return identityFromGrantResults({ esResult: keys?.es, uiamResult: keys?.uiam });
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
  const apiKeys = new ApiKeysClient({ security: securityService, logger, pluginTag: 'actions' });

  try {
    return await mint(apiKeys, request, securityService, {
      name,
      metadata: CONNECTOR_EVENT_IDENTITY_API_KEY_METADATA,
      subject: `connector event identity "${name}"`,
      uiam: 'optional',
    });
  } catch (err) {
    if (err instanceof UiamUnavailableError) {
      throw createEventIdentityUiamUnsupportedError();
    }
    throw err;
  }
};
