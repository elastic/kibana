/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { ApiKeys } from '@kbn/response-ops-api-keys';
import { CloudApiKeyNotSupportedError, UiamUnavailableError } from '@kbn/response-ops-api-keys';

import {
  createActionsApiKeysClient,
  getConnectorEventIdentitySubject,
} from '../../api_keys/client';
import { connectorEventIdentityStorage } from '../../api_keys/storage';
import {
  createEventIdentityApiKeysDisabledError,
  createEventIdentityUiamUnsupportedError,
} from './errors';
import { connectorEventIdentityApiKeyName, type ConnectorEventIdentity } from './types';

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
  const apiKeys = createActionsApiKeysClient(securityService, logger);

  let keys: ApiKeys | null;
  try {
    keys = await apiKeys.resolve(request, {
      name,
      subject: getConnectorEventIdentitySubject(name),
    });
  } catch (err) {
    if (err instanceof UiamUnavailableError || err instanceof CloudApiKeyNotSupportedError) {
      throw createEventIdentityUiamUnsupportedError();
    }
    throw err;
  }

  if (!keys) {
    throw createEventIdentityApiKeysDisabledError();
  }
  return connectorEventIdentityStorage.write(keys);
};
